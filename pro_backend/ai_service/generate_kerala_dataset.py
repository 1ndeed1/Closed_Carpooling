import csv
import random
import time
import requests
import math
from kerala_hubs import HUBS

# SETTINGS
DATASET_SIZE = 1000 # Let's start with 1000 high-quality real samples to avoid OSRM blocking
OUTPUT_FILE = "kerala_traffic_data.csv"

def get_osrm_base(p1, p2):
    """Fetch real street distance and base time from OSRM"""
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{p1['lng']},{p1['lat']};{p2['lng']},{p2['lat']}?overview=false"
        res = requests.get(url, timeout=5)
        data = res.json()
        if data['code'] == 'Ok':
            route = data['routes'][0]
            return round(route['distance'] / 1000, 2), round(route['duration'] / 60, 2)
    except:
        pass
    return None, None

def generate_traffic_multiplier(hour, is_weekend):
    """
    Realistic Kerala Traffic Signatures:
    - 8am - 10am: Heavy (1.8x - 2.5x)
    - 5pm - 8pm: Very Heavy (2.0x - 3.0x)
    - 11pm - 5am: Smooth (1.0x - 1.1x)
    - Weekends: Consistent flow but 1.2x at tourist spots
    """
    multi = 1.0
    # Peak Hours
    if 8 <= hour <= 10: multi = random.uniform(1.8, 2.5)
    elif 17 <= hour <= 20: multi = random.uniform(2.0, 3.0)
    elif 12 <= hour <= 15: multi = random.uniform(1.3, 1.6) # Afternoon lunch rush
    else: multi = random.uniform(1.1, 1.3)
    
    if is_weekend:
        multi *= 0.85 # Slightly less commute traffic
        
    return multi

def create_dataset():
    fieldnames = ['start_lat', 'start_lng', 'end_lat', 'end_lng', 'hour', 'day_of_week', 'is_weekend', 'dist_km', 'weather_factor', 'duration_min']
    
    hub_names = list(HUBS.keys())
    
    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        count = 0
        while count < DATASET_SIZE:
            h1_name = random.choice(hub_names)
            h2_name = random.choice(hub_names)
            if h1_name == h2_name: continue
            
            p1 = HUBS[h1_name]
            p2 = HUBS[h2_name]
            
            dist, base_dur = get_osrm_base(p1, p2)
            if dist is None: continue
            
            # For each real route, generate 5 different time/weather variations (Augmentation)
            for _ in range(5):
                hour = random.randint(0, 23)
                day = random.randint(0, 6)
                is_weekend = 1 if day >= 5 else 0
                weather = random.choice([1.0, 1.2, 1.5, 2.0]) # Clear, Drizzle, Rain, Monsoon
                
                multiplier = generate_traffic_multiplier(hour, is_weekend)
                final_dur = base_dur * multiplier * weather
                
                writer.writerow({
                    'start_lat': p1['lat'],
                    'start_lng': p1['lng'],
                    'end_lat': p2['lat'],
                    'end_lng': p2['lng'],
                    'hour': hour,
                    'day_of_week': day,
                    'is_weekend': is_weekend,
                    'dist_km': dist,
                    'weather_factor': weather,
                    'duration_min': round(final_dur, 2)
                })
                count += 1
            
            f.flush() # CRITICAL: Ensure data is written
            print(f"Generated {count} samples...")
            time.sleep(0.1) # Faster sampling

if __name__ == "__main__":
    create_dataset()
    print("Done! Kerala Dataset Ready.")
