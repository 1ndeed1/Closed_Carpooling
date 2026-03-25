from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SlipStream AI Routing Engine", version="1.0.0")

class Location(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None

class RerouteRequest(BaseModel):
    driver_start: Location
    driver_end: Location
    passengers: List[Location]
    mode: str = "organization" # or "friends"
    preference: str = "fastest" # "fastest" or "shortest"

@app.get("/")
async def health_check():
    return {"status": "active", "engine": "SlipStream AI", "version": "1.0.0"}

from ortools.constraint_solver import pywrapcp
from ortools.constraint_solver import routing_enums_pb2
import math

import joblib
from datetime import datetime

# Load trained model and features globaly
MODEL_PATH = "models/eta_predictor.pkl"
FEATURE_PATH = "models/feature_names.pkl"
try:
    eta_model = joblib.load(MODEL_PATH)
    feature_names = joblib.load(FEATURE_PATH)
    print(f"LOADED TRAINED MODEL: {MODEL_PATH} with {len(feature_names)} features.")
except Exception as e:
    eta_model = None
    feature_names = None
    print(f"WARNING: Model not found. Falling back to mock. Error: {e}")

def calculate_distance(p1: Location, p2: Location):
    """
    Haversine Distance (Great Circle) for better Earth-surface accuracy.
    """
    R = 6371.0 # Earth radius in km
    lat1, lon1 = math.radians(p1.lat), math.radians(p1.lng)
    lat2, lon2 = math.radians(p2.lat), math.radians(p2.lng)
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def predict_eta(start: Location, end: Location, mode: str):
    """
    Real ML Prediction using XGBoost and Kerala-specific features.
    """
    dist_km = calculate_distance(start, end)
    now = datetime.now()
    hour = now.hour
    day = now.weekday()
    is_weekend = 1 if day >= 5 else 0
    weather = 1.0 # Default clear, can be expanded to weather API
    
    if eta_model and feature_names:
        # Build features in exactly the same order as training
        raw_data = {
            'start_lat': start.lat, 'start_lng': start.lng,
            'end_lat': end.lat, 'end_lng': end.lng,
            'hour': hour, 'is_weekend': is_weekend,
            'dist_km': dist_km, 'weather_factor': weather,
            'day_of_week': day
        }
        
        # Filter and order based on feature_names.pkl
        input_row = [raw_data[f] for f in feature_names]
        features = np.array([input_row])
        
        prediction = eta_model.predict(features)[0]
        # Return predicted time, ensure it's at least dist/speed
        return round(max(float(prediction), dist_km * 1.2), 2)
    
    # Fallback mock logic
    base_speed = 30 if mode != "organization" else 20
    return round((dist_km / base_speed) * 60 * 1.15, 2)

import requests

from functools import lru_cache

# Caching OSRM results to prevent "waiting a long time" for the same route
@lru_cache(maxsize=128)
def get_osrm_route_cached(points_tuple):
    try:
        coords = ";".join([f"{p[1]},{p[0]}" for p in points_tuple])
        url = f"http://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=polyline"
        response = requests.get(url, timeout=5)
        data = response.json()
        if data.get("code") == "Ok":
            route = data["routes"][0]
            return {
                "polyline": route["geometry"],
                "distance_km": round(route["distance"] / 1000, 2),
                "duration_mins": round(route["duration"] / 60, 2)
            }
    except Exception as e:
        print(f"OSRM CACHE ERROR: {e}")
    return None

def get_osrm_route(points: List[Location]):
    """
    Wrapper for cached OSRM lookups.
    """
    points_tuple = tuple((float(p.lat if hasattr(p, 'lat') else p['lat']), 
                        float(p.lng if hasattr(p, 'lng') else p['lng'])) for p in points)
    return get_osrm_route_cached(points_tuple)

@app.post("/optimize-route")
async def optimize_route(request: RerouteRequest):
    """
    Solves the sequence of pickups based on driver preference.
    """
    try:
        passengers = request.passengers
        all_points = [request.driver_start] + passengers + [request.driver_end]
        num_points = len(all_points)

        # 1. Direct Route Fallback
        if not passengers:
            osrm_data = get_osrm_route([request.driver_start, request.driver_end])
            return {
                "optimized_sequence": [request.driver_start, request.driver_end],
                "route_polyline": osrm_data["polyline"] if osrm_data else "",
                "estimated_duration": f"{osrm_data['duration_mins'] if osrm_data else predict_eta(request.driver_start, request.driver_end, request.mode)} mins",
                "total_distance_km": osrm_data["distance_km"] if osrm_data else round(calculate_distance(request.driver_start, request.driver_end), 2),
                "ai_logic": "OSRM Direct"
            }

        # 2. Build Cost Matrix Based on Preference
        matrix = []
        for i in range(num_points):
            row = []
            for j in range(num_points):
                if i == j:
                    row.append(0)
                    continue
                
                dist = calculate_distance(all_points[i], all_points[j])
                
                if request.preference == "shortest":
                    row.append(int(dist * 1000))
                else:
                    time_mins = predict_eta(all_points[i], all_points[j], request.mode)
                    row.append(int(time_mins * 60))
            matrix.append(row)

        manager = pywrapcp.RoutingIndexManager(num_points, 1, [0], [num_points - 1])
        routing = pywrapcp.RoutingModel(manager)

        def cost_callback(from_index, to_index):
            return matrix[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

        transit_callback_index = routing.RegisterTransitCallback(cost_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )

        solution = routing.SolveWithParameters(search_parameters)
        if not solution:
            raise HTTPException(status_code=500, detail="Solver error")

        # Extract sequence
        index = routing.Start(0)
        route_indices = []
        while not routing.IsEnd(index):
            route_indices.append(manager.IndexToNode(index))
            index = solution.Value(routing.NextVar(index))
        route_indices.append(manager.IndexToNode(index))

        optimized_sequence = [all_points[i] for i in route_indices]
        
        # 3. Final Road Geometry
        osrm_data = get_osrm_route(optimized_sequence)
        
        return {
            "optimized_sequence": optimized_sequence,
            "route_polyline": osrm_data["polyline"] if osrm_data else "",
            "estimated_duration": f"{osrm_data['duration_mins'] if osrm_data else 'N/A'} mins",
            "total_distance_km": osrm_data["distance_km"] if osrm_data else 0,
            "ai_logic": f"OSRM + OR-Tools ({request.preference.upper()})",
            "preference_applied": request.preference
        }

    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
