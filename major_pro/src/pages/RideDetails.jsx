import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
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
    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [simulatedPos, setSimulatedPos] = useState(null);
    const intervalRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    useEffect(() => {
        fetchRide();
        return () => clearInterval(intervalRef.current);
    }, [id]);

    const fetchRide = async () => {
        try {
            const res = await api.get(`/rides/${id}`);
            setRide(res.data);
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

    const startSimulation = (rideData) => {
        if (!window.google?.maps?.geometry?.encoding) return;
        const path = window.google.maps.geometry.encoding.decodePath(rideData.routePolyline);
        if (path.length === 0) return;

        let index = 0;
        intervalRef.current = setInterval(() => {
            if (index < path.length) {
                setSimulatedPos({ lat: path[index].lat(), lng: path[index].lng() });
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
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-red-500 font-bold flex items-center gap-2 transition-colors">
                        ← Back to Dashboard
                    </button>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ride.status === 'active' ? 'bg-green-100 text-green-700 animate-pulse' :
                                ride.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            ● {ride.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: MAP */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-card h-[450px] relative border-white/60 shadow-2xl overflow-hidden">
                            <GoogleMap
                                mapContainerStyle={{ height: "100%", width: "100%" }}
                                center={simulatedPos || ride.startLocation}
                                zoom={14}
                                options={mapOptions}
                            >
                                {decodedPath.length > 0 && (
                                    <Polyline
                                        path={decodedPath}
                                        options={{ strokeColor: "#ef4444", strokeWeight: 5, strokeOpacity: 0.8 }}
                                    />
                                )}

                                {/* START & END MARKERS */}
                                <Marker position={ride.startLocation} label="A" />
                                <Marker position={ride.endLocation} label="B" />

                                {/* SIMULATED DRIVER */}
                                {simulatedPos && (
                                    <Marker
                                        position={simulatedPos}
                                        icon={{
                                            url: "https://cdn-icons-png.flaticon.com/512/3082/3082331.png",
                                            scaledSize: new window.google.maps.Size(40, 40),
                                            anchor: new window.google.maps.Point(20, 20)
                                        }}
                                        zIndex={100}
                                    />
                                )}
                            </GoogleMap>

                            {ride.status === 'active' && (
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white flex items-center gap-3">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                                    <p className="text-xs font-black uppercase tracking-tighter text-gray-800">Live Simulation: Driver En Route</p>
                                </div>
                            )}
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
                        <div className="glass-card p-6 border-red-100 shadow-xl">
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Your Driver</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                    {ride.driver?.name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xl font-black text-gray-800">{ride.driver?.name}</p>
                                    <p className="text-xs font-bold text-gray-400">{ride.vehicleInfo?.color} {ride.vehicleInfo?.model}</p>
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Vehicle ID</p>
                                <p className="font-black text-gray-800 tracking-widest uppercase">{ride.vehicleInfo?.plateNumber || 'TBD-2026'}</p>
                            </div>
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
        </div>
    );
}
