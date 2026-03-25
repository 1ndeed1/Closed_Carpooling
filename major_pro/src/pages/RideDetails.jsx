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
    const [debugAi, setDebugAi] = useState(false);
    const [simSpeed, setSimSpeed] = useState(2000); // Default 2s per step
    const [currentSimIndex, setCurrentSimIndex] = useState(0);

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
    const [optimizationMode, setOptimizationMode] = useState("fastest");
    const [isSimPaused, setIsSimPaused] = useState(false);

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

    const isDriver = useMemo(() => currentUser?.id === ride?.driver?._id, [currentUser, ride]);

    const targetPassenger = useMemo(() => {
        if (!ride || !ride.passengers || ride.passengers.length === 0) return null;
        if (!decodedPath || decodedPath.length === 0) return ride.passengers[0];

        // Find the next hub index relative to simulation
        const hubMapping = ride.passengers.map(p => {
            if (!p.homeLocation?.lat) return { p, idx: -1 };
            let bestIdx = -1;
            let minDist = Infinity;
            decodedPath.forEach((pt, idx) => {
                const d = calculateDistance({ lat: pt.lat(), lng: pt.lng() }, p.homeLocation);
                if (d < minDist) { minDist = d; bestIdx = idx; }
            });
            return { p, idx: bestIdx };
        });

        // The target is the next passenger in the path
        const nextHub = hubMapping
            .filter(hm => hm.idx > currentSimIndex)
            .sort((a, b) => a.idx - b.idx)[0];

        return nextHub ? nextHub.p : null;
    }, [ride, decodedPath, currentSimIndex]);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    useEffect(() => {
        fetchRide();
        return () => clearInterval(intervalRef.current);
    }, [id]);

    const handleSyncLocation = async (newLoc) => {
        try {
            // 1. Update user profile (permanent Hub)
            await api.patch("/auth/me", { homeLocation: newLoc });
            setPassengerLoc(newLoc);
            passengerLocRef.current = newLoc;

            // 2. Trigger AI Reroute
            await api.post(`/rides/${id}/reroute`);
            toast.success("Hub Updated & Route Optimized!");

            // 3. Refresh ride to see new line
            fetchRide();
            if (res.data.optimizationPreference) {
                setOptimizationMode(res.data.optimizationPreference);
            }
        } catch (err) {
            console.error("Sync failed:", err);
            toast.error("Failed to sync location");
        }
    };

    const fetchRide = async () => {
        try {
            const res = await api.get(`/rides/${id}`);
            setRide(res.data);
            setMapCenter(res.data.startLocation);

            // Set local passenger location from currentUser or res.data
            if (!isDriver && currentUser?.homeLocation?.lat) {
                setPassengerLoc(currentUser.homeLocation);
                passengerLocRef.current = currentUser.homeLocation;
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



    const routeSegments = useMemo(() => {
        if (!decodedPath || decodedPath.length === 0) return { traversed: [], futureSegments: [] };

        // 1. Traversed Path (Gray)
        const traversed = decodedPath.slice(0, currentSimIndex + 1);

        // 2. Map Passenger Hubs to Indices in decodedPath
        const hubIndices = (ride?.passengers || [])
            .map(p => {
                if (!p.homeLocation?.lat) return -1;
                let bestIdx = -1;
                let minDist = Infinity;
                decodedPath.forEach((pt, idx) => {
                    const d = calculateDistance({ lat: pt.lat(), lng: pt.lng() }, p.homeLocation);
                    if (d < minDist) { minDist = d; bestIdx = idx; }
                });
                return bestIdx;
            })
            .filter(idx => idx !== -1)
            .sort((a, b) => a - b);

        // 3. Split remaining path into colored segments
        const futureSegments = [];
        const segmentColors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"]; // Blue, Purple, Pink, Orange, Green

        let lastIdx = currentSimIndex;
        hubIndices.forEach((hubIdx, i) => {
            if (hubIdx > currentSimIndex) {
                futureSegments.push({
                    path: decodedPath.slice(lastIdx, hubIdx + 1),
                    color: segmentColors[i % segmentColors.length]
                });
                lastIdx = hubIdx;
            }
        });

        // Add final leg to Goal
        if (lastIdx < decodedPath.length - 1) {
            futureSegments.push({
                path: decodedPath.slice(lastIdx),
                color: "#ef4444" // Final Goal color (Red)
            });
        }

        return { traversed, futureSegments };
    }, [decodedPath, currentSimIndex, ride?.passengers]);

    useEffect(() => {
        if (simulatedPos) {
            if (followDriver) setMapCenter(simulatedPos);

            // For drivers, we sync passengerLocRef to the CURRENT target passenger's Hub or Goal
            if (isDriver) {
                if (targetPassenger?.homeLocation?.lat) {
                    passengerLocRef.current = targetPassenger.homeLocation;
                    setPassengerLoc(targetPassenger.homeLocation);
                } else if (ride?.endLocation?.lat) {
                    passengerLocRef.current = ride.endLocation;
                    setPassengerLoc(ride.endLocation);
                }
            }

            if (passengerLocRef.current) {
                const dist = calculateDistance(simulatedPos, passengerLocRef.current);
                setDistanceToUser(dist.toFixed(1));
                const mins = Math.ceil(dist / 0.5); // 0.5 km/min = 30 km/h
                setEta(mins > 0 ? `${mins} min` : "Arriving now");
            }
        }
    }, [simulatedPos, followDriver, isDriver, targetPassenger]);

    const startSimulation = (rideData) => {
        if (!window.google?.maps?.geometry?.encoding) return;
        const path = window.google.maps.geometry.encoding.decodePath(rideData.routePolyline);
        if (path.length === 0) return;
        if (intervalRef.current) clearInterval(intervalRef.current);

        let index = currentSimIndex > 0 ? currentSimIndex : 0;

        intervalRef.current = setInterval(() => {
            if (isSimPaused) return; // Hook into the state via closure or ref

            if (index < path.length) {
                const current = { lat: path[index].lat(), lng: path[index].lng() };
                setSimulatedPos(current);
                setCurrentSimIndex(index);
                index++;
            } else {
                clearInterval(intervalRef.current);
            }
        }, simSpeed);
    };

    // We need a ref for isSimPaused to be accessible inside the non-reactive setInterval
    const isPausedRef = useRef(isSimPaused);
    useEffect(() => { isPausedRef.current = isSimPaused; }, [isSimPaused]);

    // Update simulation interval when pause state changes
    useEffect(() => {
        if (!isSimPaused && ride?.status === 'active' && !intervalRef.current) {
            startSimulation(ride);
        }
    }, [isSimPaused]);

    const handleApprove = async (passengerId) => {
        try {
            await api.post(`/rides/${id}/approve`, { passengerId });
            toast.success("Passenger approved! Optimizing route...");
            fetchRide();
        } catch (err) {
            toast.error(err.response?.data?.message || "Approval failed");
        }
    };

    const triggerAiReroute = async (rideId, preference = null) => {
        try {
            const currentPref = preference || optimizationMode;
            await api.post(`/rides/${rideId}/reroute`, { preference: currentPref });
            toast.success(`AI Recalculating: ${currentPref.toUpperCase()}`);
            fetchRide();
        } catch (err) {
            console.error("Reroute Error:", err);
            toast.error("Failed to trigger AI reroute");
        }
    };

    if (loading || !isLoaded) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest text-gray-400">Syncing Journey Data...</div>;
    if (!ride) return null;

    return (
        <div className="min-h-screen p-6 animate-in fade-in duration-700">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* HEADER */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setDebugAi(!debugAi)}
                            className={`p-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${debugAi ? 'bg-amber-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        >
                            {debugAi ? "⚡ AI DEBUG ON" : "AI DEBUG"}
                        </button>
                        <button onClick={() => navigate("/dashboard")} className="p-4 glass-card text-gray-400 hover:text-red-500 font-bold flex items-center gap-2 transition-all">
                            ← Back
                        </button>
                    </div>
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
                                    path={routeSegments.traversed}
                                    options={{ strokeColor: "#9ca3af", strokeWeight: 4, strokeOpacity: 0.4 }}
                                />
                                {routeSegments.futureSegments.map((seg, i) => (
                                    <Polyline
                                        key={i}
                                        path={seg.path}
                                        options={{
                                            strokeColor: seg.color,
                                            strokeWeight: 6,
                                            strokeOpacity: 0.9,
                                            lineJoin: "round"
                                        }}
                                    />
                                ))}

                                <Marker position={ride.startLocation} label={{ text: "START", className: "bg-white px-2 py-1 rounded text-[8px] font-bold shadow-sm border border-gray-100" }} rotate={0} />
                                <Marker position={ride.endLocation} label={{ text: "GOAL", className: "bg-white px-2 py-1 rounded text-[8px] font-bold shadow-sm border border-gray-100" }} />

                                {/* PASSENGER HUB MARKERS */}
                                {ride.passengers?.map((p, idx) => (
                                    p.homeLocation?.lat && (
                                        <Marker
                                            key={p._id || idx}
                                            position={{ lat: Number(p.homeLocation.lat), lng: Number(p.homeLocation.lng) }}
                                            icon={{
                                                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                                                scaledSize: new window.google.maps.Size(40, 40)
                                            }}
                                            zIndex={100}
                                            label={{
                                                text: p._id === currentUser?.id ? "YOUR HUB" : p.name?.toUpperCase(),
                                                className: "bg-blue-600 text-white px-2 py-1 rounded text-[8px] font-bold shadow-lg -translate-y-10"
                                            }}
                                        />
                                    )
                                ))}

                                {simulatedPos && (
                                    <Marker
                                        position={simulatedPos}
                                        icon={{
                                            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                            scale: 6,
                                            fillColor: "#ef4444",
                                            fillOpacity: 1,
                                            strokeWeight: 2,
                                            rotation: 0 // In real app, calculate heading
                                        }}
                                    />
                                )}
                            </GoogleMap>

                            {/* MAP CONTROLS - REPOSITIONED */}
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

                        {/* AI SIMULATION TOOLS */}
                        {debugAi && (
                            <div className="glass-card p-6 border-2 border-amber-500/30 bg-amber-50/10 shadow-2xl space-y-4 animate-in zoom-in-95 duration-300">
                                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                    Simulation Console
                                </h4>

                                <div className="space-y-4 pt-2 border-t border-amber-200/50">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Simulation Speed</p>
                                        <span className="text-[9px] font-bold text-amber-600">{(simSpeed / 1000).toFixed(1)}s / step</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="200"
                                        max="5000"
                                        step="100"
                                        value={simSpeed}
                                        onChange={(e) => {
                                            setSimSpeed(parseInt(e.target.value));
                                            if (ride && ride.status === 'active') startSimulation(ride);
                                        }}
                                        className="w-full accent-amber-500 h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer"
                                    />

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setFollowDriver(!followDriver);
                                                if (!followDriver && simulatedPos) setMapCenter(simulatedPos);
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${followDriver ? 'bg-amber-600 text-white shadow-inner' : 'bg-white border-2 border-amber-200 text-amber-600'}`}
                                        >
                                            {followDriver ? "✓ Auto-Follow" : "Auto-Follow"}
                                        </button>
                                        <button
                                            onClick={() => setIsSimPaused(!isSimPaused)}
                                            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isSimPaused ? 'bg-red-500 text-white' : 'bg-green-500 text-white animate-pulse'}`}
                                        >
                                            {!isSimPaused ? "⏸ Pause Sim" : "▶ Resume Sim"}
                                        </button>
                                    </div>
                                </div>

                                {isDriver ? (
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-bold text-amber-700/60 uppercase">Route Optimization Preference</p>
                                        <div className="grid grid-cols-2 gap-2 p-1 bg-amber-100/50 rounded-xl">
                                            <button
                                                onClick={() => {
                                                    setOptimizationMode("fastest");
                                                    triggerAiReroute(id, "fastest");
                                                }}
                                                className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${optimizationMode === 'fastest' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-700 hover:bg-amber-200'}`}
                                            >
                                                🚀 Fastest
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOptimizationMode("shortest");
                                                    triggerAiReroute(id, "shortest");
                                                }}
                                                className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${optimizationMode === 'shortest' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-700 hover:bg-amber-200'}`}
                                            >
                                                📏 Shortest
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => triggerAiReroute(id)}
                                            className="w-full py-3 bg-white border-2 border-amber-500 text-amber-600 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg hover:bg-amber-500 hover:text-white transition-all"
                                        >
                                            Force AI Recalculate
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-bold text-amber-700/60 uppercase">Passenger Controls</p>
                                        <button
                                            onClick={() => setIsLocModalOpen(true)}
                                            className="w-full py-3 bg-white border-2 border-amber-200 text-amber-600 rounded-xl font-black text-[9px] uppercase tracking-[0.2em]"
                                        >
                                            Spoof My Hub Location
                                        </button>
                                        <p className="text-[8px] text-amber-400 italic font-medium px-2 leading-relaxed">
                                            Updating your location will trigger an automatic AI reroute for the driver in "Simulation Mode".
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
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
                                    {isDriver ? (targetPassenger ? "PICKUP MISSION" : "DESTINATION MISSION") : "LIVE TRACKING"}
                                </h3>

                                <div className="flex items-end justify-between mb-6">
                                    <div className="space-y-1">
                                        <p className="text-4xl font-black text-gray-800 tracking-tighter">{eta || "--"}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Estimated Arrival</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-2xl font-black text-red-600 tracking-tighter">{distanceToUser || "--"} km</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                            {isDriver ? (targetPassenger ? "To Passenger" : "To Destination") : "Away from you"}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-red-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <div className="flex flex-col">
                                                <p className="text-sm font-bold text-gray-700">
                                                    {isDriver ? (targetPassenger ? "Approaching Passenger" : "Heading to Goal") : "Driver is approaching"}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">
                                                        {optimizationMode === 'fastest' ? "Optimal Time Sequence" : "Shortest Path Sequence"}
                                                    </span>
                                                    {isSimPaused && (
                                                        <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded uppercase animate-pulse">
                                                            Simulation Paused
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-medium text-gray-400 truncate max-w-[150px]">
                                                    {passengerLoc.address || "Syncing Hub..."}
                                                </p>
                                            </div>
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
                                {isDriver ? (targetPassenger ? "Target Passenger" : "Next Stop: Goal") : "Your Driver"}
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

                        {/* JOIN REQUESTS (FOR DRIVER ONLY) */}
                        {isDriver && ride.pendingPassengers?.length > 0 && (
                            <div className="glass-card p-6 shadow-xl border-l-4 border-amber-500 animate-in slide-in-from-right duration-500">
                                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Join Requests
                                </h4>
                                <div className="space-y-4">
                                    {ride.pendingPassengers.map((p) => (
                                        <div key={p._id} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-black text-amber-700">
                                                    {p.name?.charAt(0)}
                                                </div>
                                                <p className="text-xs font-bold text-gray-700">{p.name}</p>
                                            </div>
                                            <button
                                                onClick={() => handleApprove(p._id)}
                                                className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-lg shadow-amber-900/10"
                                            >
                                                Approve
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
                                            handleSyncLocation(newLoc);
                                            setIsLocModalOpen(false);
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
                                        const newLoc = { ...tempPin };
                                        handleSyncLocation(newLoc);
                                        setTempPin(null);
                                        setIsLocModalOpen(false);
                                    }}
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-red-600 transition-all active:scale-95"
                                >
                                    Confirm & Sync Hub
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
