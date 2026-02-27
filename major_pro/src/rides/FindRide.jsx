import { useEffect, useState, useMemo } from "react";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import api from "../api/api";
import toast from "react-hot-toast";
import { useUser } from "../components/UserContext";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import LocationPicker from "../components/LocationPicker";

const mapContainerStyle = {
  height: "180px",
  width: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  scrollwheel: false,
  disableDoubleClickZoom: true,
  draggable: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

function RideCard({ ride, onJoin, joining, userPos }) {
  const { user } = useUser();
  const userId = user?._id;
  const alreadyJoined = ride.passengers?.some(p => (p._id || p) === userId);

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

  const proximity = useMemo(() => {
    if (!userPos || !ride.startLocation) return null;
    const R = 6371; // km
    const dLat = (ride.startLocation.lat - userPos.lat) * (Math.PI / 180);
    const dLon = (ride.startLocation.lng - userPos.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userPos.lat * (Math.PI / 180)) * Math.cos(ride.startLocation.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }, [userPos, ride.startLocation]);

  return (
    <div className="glass-card overflow-hidden group hover:shadow-2xl transition-all duration-500 border border-white/40">
      {/* MINI MAP */}
      <div className="relative h-[180px] bg-gray-100">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={ride.startLocation}
          zoom={12}
          options={mapOptions}
        >
          {decodedPath.length > 0 && (
            <Polyline
              path={decodedPath}
              options={{
                strokeColor: "#ef4444",
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }}
            />
          )}
          <Marker position={ride.startLocation} />
        </GoogleMap>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-gray-800 shadow-sm border border-gray-100">
            {ride.distanceKm} KM
          </span>
          <span className="bg-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
            {ride.estimatedDuration}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="font-black text-gray-800 text-lg leading-tight uppercase tracking-tight">
              {ride.driver?.name}'s Journey
            </h3>
            {ride.vehicleInfo?.model && (
              <p className="text-xs font-bold text-red-500 mt-1">
                🚗 {ride.vehicleInfo.color} {ride.vehicleInfo.model}
              </p>
            )}
          </div>
          <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${ride.visibility === "friends" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
            }`}>
            {ride.visibility}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <p className="text-sm text-gray-600 font-medium truncate">{ride.startLocation?.address}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <p className="text-sm text-gray-800 font-bold truncate">{ride.endLocation?.address}</p>
          </div>
        </div>

        {proximity && (
          <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Pickup Distance</p>
            <p className="text-sm font-black text-red-600">{proximity} KM away</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase">Seats</p>
            <p className="font-black text-gray-800">{ride.seats} Left</p>
          </div>
          <button
            disabled={alreadyJoined || joining}
            onClick={() => onJoin(ride._id)}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${alreadyJoined
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-500 text-white shadow-lg shadow-red-200 hover:scale-105 active:scale-95'
              }`}
          >
            {alreadyJoined ? "Joined ✓" : joining ? "..." : "Join Ride"}
          </button>
        </div>
      </div>
    </div>
  );
}
export default function FindRide() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const { user } = useUser();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    fetchRides();

    // Attempt to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn("Location permission denied")
      );
    }
  }, []);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params = {};
      if (origin) {
        params.originLat = origin.lat;
        params.originLng = origin.lng;
      }
      if (destination) {
        params.destLat = destination.lat;
        params.destLng = destination.lng;
      }

      const res = await api.get("/rides/search", { params });
      setRides(res.data);
    } catch (err) {
      toast.error("Failed to load rides");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (rideId) => {
    setJoiningId(rideId);
    try {
      await api.post(`/rides/${rideId}/request`);
      toast.success("Welcome aboard! 🚗");
      fetchRides();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading || !isLoaded) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
      <div className="text-4xl mb-4">🌍</div>
      <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Finding available journeys...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="glass-card p-6 space-y-6">
        <h2 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Where are you going?</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LocationPicker
            label="Pickup Location"
            onChange={setOrigin}
            initialValue={user?.homeLocation}
          />
          <LocationPicker
            label="Destination"
            onChange={setDestination}
          />
        </div>

        <button
          onClick={fetchRides}
          className="glass-button !w-auto px-12 block mx-auto mt-4"
        >
          {loading ? "Searching..." : "Find Rides"}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Available Journeys</h2>
          <p className="text-gray-500 font-medium italic">Routes shared within your community</p>
        </div>
      </div>

      {rides.length === 0 ? (
        <div className="glass-card p-12 text-center bg-gray-50/50 border-dashed border-2 border-gray-200">
          <p className="text-gray-400 font-bold">No rides found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {rides.map(ride => (
            <RideCard
              key={ride._id}
              ride={ride}
              onJoin={handleJoin}
              joining={joiningId === ride._id}
              userPos={userPos}
            />
          ))}
        </div>
      )}
    </div>
  );
}
