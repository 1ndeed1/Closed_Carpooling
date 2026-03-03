import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import { useUser } from "../components/UserContext";
import LocationPicker from "../components/LocationPicker";
import toast from "react-hot-toast";

const mapContainerStyle = { height: "400px", width: "100%" };
const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
};

export default function RideDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [simulatedPos, setSimulatedPos] = useState(null);
    const intervalRef = useRef(null);

    // DYNAMIC PASSENGER LOCATION
    const [passengerLoc, setPassengerLoc] = useState({ lat: 12.9716, lng: 77.5946 });
    const passengerLocRef = useRef({ lat: 12.9716, lng: 77.5946 });
    const [distanceToUser, setDistanceToUser] = useState(null);
    const [eta, setEta] = useState(null);
    const [isLocModalOpen, setIsLocModalOpen] = useState(false);
    const [tempPin, setTempPin] = useState(null);
    const [followDriver, setFollowDriver] = useState(true);
    const [mapCenter, setMapCenter] = useState({ lat: 12.9716, lng: 77.5946 });
    const autocompleteRef = useRef(null);

    const isDriver = useMemo(() => currentUser?.id === ride?.driver?._id, [currentUser, ride]);
    const targetPassenger = useMemo(() => ride?.passengers?.[0] || null, [ride]);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    useEffect(() => {
        // ONLY Passengers set their Hub autonomously via GPS
        if (!isDriver && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setPassengerLoc(newLoc);
                    passengerLocRef.current = newLoc;
                }
            );
        }

        fetchRide();
        return () => clearInterval(intervalRef.current);
    }, [id, isDriver]);

    const fetchRide = async () => {
        try {
            const res = await api.get(`/rides/${id}`);
            setRide(res.data);
            setMapCenter(res.data.startLocation);

            // If the ride has a specific pickup location for the passenger (using startLocation as default backup)
            if (res.data.startLocation) {
                setPassengerLoc(res.data.startLocation);
                passengerLocRef.current = res.data.startLocation;
            }

            if (res.data.status === 'active' && !simulatedPos) {
                startSimulation(res.data);
            }
        } catch (err) {
            toast.error("Failed to load journey details");
            navigate("/dashboard");
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = (p1, p2) => {
        if (!p1 || !p2) return 0;
        const R = 6371;
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLon = (p2.lng - p1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const decodedPath = useMemo(() => {
        if (ride?.routePolyline && window.google?.maps?.geometry?.encoding) {
            try {
                return window.google.maps.geometry.encoding.decodePath(ride.routePolyline);
            } catch (e) {
                return [];
            }
        }
        return [];
    }, [ride]);

    const routeSegments = useMemo(() => {
        if (!decodedPath || !passengerLoc) return { pickupPath: [], destinationPath: [] };
        let hubIndex = 0;
        let minDist = Infinity;
        decodedPath.forEach((pt, idx) => {
            const d = calculateDistance({ lat: pt.lat(), lng: pt.lng() }, passengerLoc);
            if (d < minDist) {
                minDist = d;
                hubIndex = idx;
            }
        });
        return {
            pickupPath: decodedPath.slice(0, hubIndex + 1),
            destinationPath: decodedPath.slice(hubIndex)
        };
    }, [decodedPath, passengerLoc]);

    useEffect(() => {
        if (simulatedPos) {
            if (followDriver) setMapCenter(simulatedPos);
            if (passengerLocRef.current) {
                const dist = calculateDistance(simulatedPos, passengerLocRef.current);
                setDistanceToUser(dist.toFixed(1));
                const mins = Math.ceil(dist / 0.5);
                setEta(mins > 0 ? `${mins} min` : "Arriving now");
            }
        }
    }, [simulatedPos, followDriver]);

    const startSimulation = (rideData) => {
        if (!window.google?.maps?.geometry?.encoding) return;
        const path = window.google.maps.geometry.encoding.decodePath(rideData.routePolyline);
        if (path.length === 0) return;
        let index = 0;
        intervalRef.current = setInterval(() => {
            if (index < path.length) {
                const current = { lat: path[index].lat(), lng: path[index].lng() };
                setSimulatedPos(current);
                index++;
            } else {
                clearInterval(intervalRef.current);
            }
        }, 2000);
    };

    if (loading || !isLoaded) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest text-gray-400">Syncing Journey Data...</div>;
    if (!ride) return null;

    return (
        <div className="min-h-screen p-6 animate-in fade-in duration-700">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* HEADER */}
                <div className="flex justify-between items-center">
                    <button onClick={() => navigate("/dashboard")} className="p-4 glass-card text-gray-400 hover:text-red-500 font-bold flex items-center gap-2 transition-all">
                        ← Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${ride.status === 'active' ? 'bg-green-100 text-green-700 animate-pulse' :
                            ride.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            ● {ride.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: MAP */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card h-[450px] relative border-white/60 shadow-2xl overflow-hidden group/map">
                            <GoogleMap
                                mapContainerStyle={{ height: "100%", width: "100%" }}
                                center={mapCenter}
                                zoom={14}
                                onDragStart={() => setFollowDriver(false)}
                                options={mapOptions}
                            >
                                <Polyline
                                    path={routeSegments.pickupPath}
                                    options={{ strokeColor: "#3b82f6", strokeWeight: 5, strokeOpacity: 0.8 }}
                                />
                                <Polyline
                                    path={routeSegments.destinationPath}
                                    options={{ strokeColor: "#ef4444", strokeWeight: 4, strokeOpacity: 0.6 }}
                                />

                                <Marker position={ride.startLocation} label={{ text: "START", className: "bg-white px-2 py-1 rounded text-[8px] font-bold shadow-sm border border-gray-100" }} />
                                <Marker position={ride.endLocation} label={{ text: "GOAL", className: "bg-white px-2 py-1 rounded text-[8px] font-bold shadow-sm border border-gray-100" }} />

                                <Marker
                                    position={passengerLoc}
                                    icon={{
                                        url: "https://cdn-icons-png.flaticon.com/512/2830/2830305.png",
                                        scaledSize: new window.google.maps.Size(35, 35)
                                    }}
                                    label={{ text: isDriver ? "PICKUP HUB" : "YOUR HUB", className: "bg-red-500 text-white px-2 py-1 rounded text-[8px] font-bold shadow-lg -translate-y-8" }}
                                />

                                {simulatedPos && (
                                    <Marker
                                        position={simulatedPos}
                                        icon={{
                                            url: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
                                            scaledSize: new window.google.maps.Size(40, 40)
                                        }}
                                    />
                                )}
                            </GoogleMap>

                            {/* MAP CONTROLS */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                                <button
                                    onClick={() => {
                                        setFollowDriver(true);
                                        if (simulatedPos) setMapCenter(simulatedPos);
                                    }}
                                    className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all shadow-xl backdrop-blur-md pointer-events-auto ${followDriver
                                        ? "bg-red-500 text-white border-red-400"
                                        : "bg-white text-gray-700 border-white hover:bg-gray-50 opacity-90"
                                        }`}
                                >
                                    <div className="relative flex items-center justify-center">
                                        <div className={`w-2 h-2 rounded-full ${followDriver ? "bg-white animate-ping" : "bg-red-500"}`} />
                                        <div className={`absolute w-2 h-2 rounded-full ${followDriver ? "bg-white" : "bg-red-500"}`} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {followDriver ? "FOLLOWING DRIVER" : "FOLLOW DRIVER"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* TRIP DETAILS TABLE */}
                        <div className="glass-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase">Distance</p>
                                <p className="text-xl font-black text-gray-800">{ride.distanceKm} km</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase">Est. Time</p>
                                <p className="text-xl font-black text-gray-800">{ride.estimatedDuration}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase">Seats Left</p>
                                <p className="text-xl font-black text-gray-800">{ride.seats}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase">Visibility</p>
                                <p className="text-xl font-black text-red-600 capitalize">{ride.visibility}</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: INFO PANEL */}
                    <div className="space-y-6">
                        {ride.status === "active" && (
                            <div className="glass-card p-6 border-2 border-red-500/20 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="text-4xl">🛰️</span>
                                </div>

                                <h3 className="text-[10px] font-black tracking-[0.2em] text-red-500 uppercase mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                                    {isDriver ? "PICKUP MISSION" : "LIVE TRACKING"}
                                </h3>

                                <div className="flex items-end justify-between mb-6">
                                    <div className="space-y-1">
                                        <p className="text-4xl font-black text-gray-800 tracking-tighter">{eta || "--"}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Estimated Arrival</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-2xl font-black text-red-600 tracking-tighter">{distanceToUser || "--"} km</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                            {isDriver ? "To Passenger" : "Away from you"}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-red-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <p className="text-sm font-bold text-gray-700">
                                                {isDriver ? "Approaching Passenger" : "Driver is approaching"}
                                            </p>
                                        </div>
                                    </div>
                                    {!isDriver && (
                                        <button
                                            onClick={() => setIsLocModalOpen(true)}
                                            className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 bg-red-100/50 px-3 py-2 rounded-xl transition-all"
                                        >
                                            Set Location
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="glass-card p-6 border-red-100 shadow-xl">
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">
                                {isDriver ? "Target Passenger" : "Your Driver"}
                            </h4>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                    {(isDriver ? targetPassenger?.name : ride.driver?.name)?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xl font-black text-gray-800">
                                        {isDriver ? targetPassenger?.name || "Assigning..." : ride.driver?.name}
                                    </p>
                                    <p className="text-xs font-bold text-gray-400">
                                        {isDriver ? "Confirmed Passenger" : `${ride.vehicleInfo?.color} ${ride.vehicleInfo?.model}`}
                                    </p>
                                </div>
                            </div>

                            {!isDriver && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Vehicle ID</p>
                                    <p className="font-black text-gray-800 tracking-widest uppercase">{ride.vehicleInfo?.plateNumber || 'TBD-2026'}</p>
                                </div>
                            )}
                        </div>

                        <div className="glass-card p-6 shadow-xl">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Manifest (Passengers)</h4>
                            <div className="space-y-3">
                                {ride.passengers?.map((p, i) => (
                                    <div key={p._id || i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-500">
                                            {p.name?.charAt(0)}
                                        </div>
                                        <p className="text-sm font-bold text-gray-700">{p.name}</p>
                                    </div>
                                ))}
                                {ride.passengers?.length === 0 && (
                                    <p className="text-xs font-bold text-gray-400 italic">No companions yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LOCATION SELECTOR MODAL */}
            {isLocModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsLocModalOpen(false)} />
                    <div className="glass-card max-w-lg w-full p-8 relative z-10 space-y-6 animate-mac-pop">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Set Your Hub</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Pick where you want to be picked up</p>
                            </div>
                            <button onClick={() => setIsLocModalOpen(false)} className="text-gray-400 hover:text-red-500 transform hover:rotate-90 transition-all font-black">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition((pos) => {
                                            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                                            setPassengerLoc(newLoc);
                                            passengerLocRef.current = newLoc;
                                            setIsLocModalOpen(false);
                                            toast.success("Location Sync Active");
                                        });
                                    }
                                }}
                                className="glass-card p-4 hover:bg-gray-50 transition-all text-center space-y-2 group"
                            >
                                <span className="text-2xl group-hover:scale-110 block transition-transform">📍</span>
                                <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Auto Detect</p>
                            </button>
                            <button
                                onClick={() => setTempPin(passengerLoc)}
                                className={`glass-card p-4 hover:bg-gray-50 transition-all text-center space-y-2 group ${tempPin ? 'border-red-500 bg-red-50/20' : ''}`}
                            >
                                <span className="text-2xl group-hover:scale-110 block transition-transform">🗺️</span>
                                <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Pick on Map</p>
                            </button>
                        </div>
                        <div className="bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100 shadow-inner">
                            <LocationPicker
                                label="Deploy Custom Hub"
                                value={tempPin || { address: "" }}
                                onChange={setTempPin}
                                showFavorites={false}
                            />
                        </div>

                        {tempPin && tempPin.lat && (
                            <div className="animate-in slide-in-from-top-2">
                                <button
                                    onClick={() => {
                                        setPassengerLoc(tempPin);
                                        passengerLocRef.current = tempPin;
                                        setTempPin(null);
                                        setIsLocModalOpen(false);
                                        toast.success("Mission Intelligence Updated");
                                    }}
                                    className="w-full bg-red-500 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs hover:bg-red-600 shadow-xl shadow-red-100 transition-all active:scale-[0.98]"
                                >
                                    Lock Coordinates
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
