import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import api from "../api/api";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import toast from "react-hot-toast";

const mapContainerStyle = { height: "150px", width: "100%" };
const mapOptions = { disableDefaultUI: true, zoomControl: false, scrollwheel: false, draggable: false };
const libraries = GOOGLE_MAPS_LIBRARIES;

function DriverRideCard({ ride, onUpdateStatus, onDelete }) {
  const decodedPath = useMemo(() => {
    if (ride.routePolyline && window.google?.maps?.geometry?.encoding) {
      try {
        return window.google.maps.geometry.encoding.decodePath(ride.routePolyline);
      } catch (e) {
        console.error("Polyline decoding failed", e);
        return [];
      }
    }
    return [];
  }, [ride.routePolyline]);

  return (
    <div className="glass-card overflow-hidden border border-white/60 group hover:shadow-xl transition-all duration-300">
      <div className="h-[150px] relative bg-gray-50">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={ride.startLocation}
          zoom={12}
          options={mapOptions}
        >
          {decodedPath.length > 0 && (
            <Polyline
              path={decodedPath}
              options={{ strokeColor: "#ef4444", strokeWeight: 3 }}
            />
          )}
          <Marker position={ride.startLocation} />
        </GoogleMap>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase">Passengers</p>
            <p className="font-black text-gray-800">{ride.passengers?.length || 0} / {ride.seats + (ride.passengers?.length || 0)}</p>
          </div>
          <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-sm ${ride.status === 'active' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600'
            }`}>
            {ride.status}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-800 truncate">🚩 {ride.startLocation?.address}</p>
          <p className="text-xs text-gray-500 font-medium truncate">🏁 {ride.endLocation?.address}</p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            to={`/ride/${ride._id}`}
            className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 text-center hover:bg-gray-200 transition-all border border-gray-100"
          >
            Track Trip Details
          </Link>
          <div className="flex gap-2">
            {ride.status === "scheduled" && (
              <button
                onClick={() => onUpdateStatus(ride._id, "active")}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500 text-white shadow-lg shadow-red-200 hover:scale-105 transition-all"
              >
                Start Ride
              </button>
            )}
            {ride.status === "active" && (
              <button
                onClick={() => onUpdateStatus(ride._id, "completed")}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-500 text-white shadow-lg shadow-green-200 hover:scale-105 transition-all"
              >
                Complete
              </button>
            )}
            <button
              onClick={() => onDelete(ride._id)}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all border border-red-100"
              title="Remove Journey"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverRides() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    fetchDriverRides();
  }, []);

  const fetchDriverRides = async () => {
    try {
      const res = await api.get("/rides/driver");
      setRides(res.data);
    } catch (err) {
      console.error("Failed to fetch driver rides");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (rideId, status) => {
    try {
      await api.patch(`/rides/${rideId}/status`, { status });
      toast.success(`Journey is now ${status}!`);
      fetchDriverRides();
    } catch (err) {
      toast.error("Status update failed");
    }
  };

  const removeRide = async (rideId) => {
    if (!window.confirm("Are you sure you want to remove this journey? This will cancel it for all passengers.")) return;
    try {
      await api.delete(`/rides/${rideId}`);
      toast.success("Journey removed");
      fetchDriverRides();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove journey");
    }
  };

  if (loading || !isLoaded) return <div className="animate-pulse space-y-4">{[1, 2].map(n => <div key={n} className="h-40 bg-gray-100 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🚗</span>
        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Your Posted Rides</h3>
      </div>

      {rides.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
          <p className="text-gray-400 font-bold text-sm">You haven't posted any journeys yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rides.map(ride => (
            <DriverRideCard
              key={ride._id}
              ride={ride}
              onUpdateStatus={updateStatus}
              onDelete={removeRide}
            />
          ))}
        </div>
      )}
    </div>
  );
}
