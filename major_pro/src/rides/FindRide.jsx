import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import api from "../api/api";
import toast from "react-hot-toast";
import { useUser } from "../components/UserContext";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import LocationPicker from "../components/LocationPicker";

const mapContainerStyle = {
  height: "140px",
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
    <div className="glass-card overflow-hidden group hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12)] transition-all duration-700 border-white/60 flex flex-col h-full bg-white/70 backdrop-blur-3xl animate-in zoom-in-95 duration-700">
      {/* MAP PEEK SECTION */}
      <div className="relative h-[150px] bg-gray-100 overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ height: '100%', width: '100%' }}
          center={ride.startLocation}
          zoom={12}
          options={mapOptions}
        >
          {decodedPath.length > 0 && (
            <Polyline
              path={decodedPath}
              options={{
                strokeColor: "#ef4444",
                strokeOpacity: 1,
                strokeWeight: 4,
              }}
            />
          )}
          <Marker position={ride.startLocation} />
        </GoogleMap>

        {/* OVERLAY GRADIENT */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />

        {/* FLOATING CHIPS */}
        <div className="absolute top-3 left-3 flex gap-2">
          <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm border border-white/40 animate-in slide-in-from-left duration-700">
            <span className="text-[9px] font-black uppercase text-gray-400">Dist</span>
            <span className="text-[10px] font-black text-gray-800 tracking-tighter">{ride.distanceKm} KM</span>
          </div>
          <div className="bg-red-500/90 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-lg shadow-red-200/40 animate-in slide-in-from-left duration-700 delay-100">
            <span className="text-[9px] font-black uppercase text-red-100">ETA</span>
            <span className="text-[10px] font-black text-white tracking-tighter">{ride.estimatedDuration}</span>
          </div>
        </div>

        {/* DRIVER AVATAR OVERLAY */}
        <div className="absolute bottom-3 left-5 flex items-end gap-3 animate-in slide-in-from-bottom-3 duration-1000">
          <div className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-lg border-2 border-white group-hover:rotate-6 transition-transform">
            {ride.driver?.name?.charAt(0).toUpperCase() || '👤'}
          </div>
          <div className="mb-0.5">
            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${ride.visibility === "friends" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-blue-100 text-blue-700 border border-blue-200"
              }`}>
              {ride.visibility}
            </span>
            <h4 className="text-xs font-black text-gray-800 tracking-tighter uppercase mt-0.5">{ride.driver?.name}</h4>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 space-y-5">
        {/* VEHICLE INFO */}
        {ride.vehicleInfo?.model && (
          <div className="flex items-center gap-2.5 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm text-sm">🏎️</div>
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Transport Vessel</p>
              <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">{ride.vehicleInfo.color} {ride.vehicleInfo.model}</p>
            </div>
          </div>
        )}

        {/* ROUTE STEPS */}
        <div className="space-y-3 relative">
          <div className="absolute left-[9px] top-5 bottom-5 w-[1.5px] bg-gradient-to-b from-gray-200 via-red-200 to-red-500" />
          <div className="flex items-start gap-3">
            <div className="w-[18px] h-[18px] rounded-full bg-white border-2 border-gray-100 shadow-sm z-10" />
            <div className="min-w-0">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Departure</p>
              <p className="text-xs font-bold text-gray-600 truncate mt-0.5">{ride.startLocation?.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-white shadow-lg shadow-red-100 z-10 animate-pulse" />
            <div className="min-w-0">
              <p className="text-[8px] font-black text-red-400 uppercase tracking-widest leading-none">Destination</p>
              <p className="text-xs font-black text-gray-800 truncate mt-0.5">{ride.endLocation?.address}</p>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-4 flex items-center justify-between mt-auto border-t border-gray-50">
          <div className="flex flex-col">
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1">Vacancy</p>
            <div className="flex gap-1">
              {[...Array(Math.min(5, ride.seats))].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm" />
              ))}
              <span className="text-[10px] font-black text-gray-800 ml-1 leading-none">{ride.seats} LEFT</span>
            </div>
          </div>

          <button
            disabled={alreadyJoined || joining}
            onClick={() => onJoin(ride._id)}
            className={`px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn ${alreadyJoined
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-gray-900 text-white shadow-xl hover:bg-red-500 hover:shadow-red-200 active:scale-95'
              }`}
          >
            <span className="relative z-10">{alreadyJoined ? "JOINED ✓" : joining ? "PENDING..." : "DEPLOY"}</span>
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
  const [filterType, setFilterType] = useState("all");
  const { user } = useUser();
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Force Friend Pool if no organization approval
  useEffect(() => {
    if (user && user.orgStatus !== "approved") {
      setFilterType("friends");
    }
  }, [user]);

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
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleJoin = async (rideId) => {
    setJoiningId(rideId);
    try {
      await api.post(`/rides/${rideId}/request`);
      toast.success("Connection established! 🚀");
      fetchRides();
    } catch (err) {
      toast.error(err.response?.data?.message || "Deployment failed");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading || !isLoaded) return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in duration-1000">
      <div className="w-20 h-20 rounded-2xl bg-red-500 shadow-2xl shadow-red-200 flex items-center justify-center text-2xl animate-bounce">🌍</div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-black text-gray-800 tracking-tighter uppercase">Scanning Grid...</h3>
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Syncing deployment units</p>
      </div>
    </div>
  );

  const filteredRides = rides.filter(r => filterType === "all" || r.visibility === filterType);

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      {/* SEARCH ORBIT SECTION */}
      <section className="relative group p-1">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-500/5 to-amber-500/5 rounded-[2.5rem] blur transition duration-1000" />
        <div className="glass-card p-8 md:p-10 relative bg-white/70 backdrop-blur-3xl border-white/60 space-y-8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.03)]">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-50 text-red-500 mb-2 border border-red-100">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[8px] font-black uppercase tracking-widest">Scouting Grid</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tighter uppercase leading-none">Find Your Mission</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-sm">Secure your position in vetted commuter units.</p>
            </div>

            {/* SEGMENTED POOL TABS */}
            <div className="bg-gray-100/30 p-1 rounded-xl border border-gray-200/50 flex gap-0.5 backdrop-blur-sm self-start">
              {[
                { id: "all", label: "Global", icon: "🌐" },
                { id: "organization", label: "Org", icon: "🏢", hide: user?.orgStatus !== "approved" },
                { id: "friends", label: "Friends", icon: "🤝" }
              ].filter(tab => !tab.hide).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filterType === tab.id
                    ? 'bg-white text-gray-900 shadow-md border border-gray-100'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-3">Start Location</label>
              <div className="bg-white/50 border border-gray-100 hover:border-red-100 transition-colors p-1.5 rounded-2xl">
                <LocationPicker
                  label=""
                  onChange={setOrigin}
                  value={origin}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-3">Destination</label>
              <div className="bg-white/50 border border-gray-100 hover:border-red-100 transition-colors p-1.5 rounded-2xl">
                <LocationPicker
                  label=""
                  onChange={setDestination}
                  value={destination}
                />
              </div>
            </div>
          </div>

          <button
            onClick={fetchRides}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-[0.3em] text-[11px] shadow-xl shadow-gray-400/20 hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            {loading ? "SCANNING..." : "EXECUTE SEARCH →"}
          </button>
        </div>
      </section>

      {/* RESULTS GRID */}
      <section className="space-y-6 px-1">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase">Deployment Units</h2>
            <div className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest">
              {filteredRides.length} UNIT{filteredRides.length !== 1 ? 'S' : ''}
            </div>
          </div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest hidden sm:block italic">Updated real-time</p>
        </div>

        {filteredRides.length === 0 ? (
          <div className="glass-card p-16 text-center border-dashed border-2 bg-gray-50/20">
            <div className="w-16 h-16 rounded-full bg-white shadow-md mx-auto mb-6 flex items-center justify-center text-2xl">📡</div>
            <p className="text-lg font-black text-gray-800 tracking-tighter uppercase mb-1">Grid Empty</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No active units match your search parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRides.map((ride, idx) => (
              <div key={ride._id} style={{ animationDelay: `${idx * 100}ms` }} className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <RideCard
                  ride={ride}
                  onJoin={handleJoin}
                  joining={joiningId === ride._id}
                  userPos={userPos}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
