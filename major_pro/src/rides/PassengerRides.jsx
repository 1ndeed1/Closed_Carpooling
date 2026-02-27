import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import api from "../api/api";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";
import toast from "react-hot-toast";

const mapContainerStyle = { height: "150px", width: "100%" };
const mapOptions = { disableDefaultUI: true, zoomControl: false, scrollwheel: false, draggable: false };
const libraries = GOOGLE_MAPS_LIBRARIES;

function PassengerRideCard({ ride, onLeave }) {
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
        <div className={`glass-card overflow-hidden border transition-all duration-300 ${ride.status === 'active' ? 'border-red-400 ring-4 ring-red-400/10' : 'border-white/60'
            }`}>
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
                <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-sm ${ride.status === 'active' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-white'
                        }`}>
                        {ride.status}
                    </span>
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Driver</p>
                        <p className="font-black text-gray-800">{ride.driver?.name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Leaving At</p>
                        <p className="font-bold text-gray-700 text-sm">
                            {new Date(ride.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium truncate">🏁 {ride.endLocation?.address}</p>
                </div>

                <Link
                    to={`/ride/${ride._id}`}
                    className={`w-full block text-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ride.status === 'active'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-200 hover:scale-[1.02]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    {ride.status === 'active' ? '⚡ Track Trip Live' : 'View Trip Details'}
                </Link>

                {ride.status === "scheduled" && (
                    <button
                        onClick={() => onLeave(ride._id)}
                        className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                    >
                        Leave Journey
                    </button>
                )}
            </div>
        </div>
    );
}

export default function PassengerRides() {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries,
    });

    useEffect(() => {
        fetchJoinedRides();
    }, []);

    const fetchJoinedRides = async () => {
        try {
            const res = await api.get("/rides/passenger");
            setRides(res.data);
        } catch (err) {
            console.error("Failed to fetch passenger rides");
        } finally {
            setLoading(false);
        }
    };

    const leaveRide = async (rideId) => {
        if (!window.confirm("Leave this journey?")) return;
        try {
            await api.post(`/rides/${rideId}/leave`);
            toast.success("Journey left");
            fetchJoinedRides();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to leave");
        }
    };

    if (loading || !isLoaded) return <div className="animate-pulse space-y-4">{[1, 2].map(n => <div key={n} className="h-40 bg-gray-100 rounded-2xl" />)}</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎒</span>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Your Journeys</h3>
            </div>

            {rides.length === 0 ? (
                <div className="p-8 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-bold text-sm">You haven't joined any journeys yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rides.map(ride => <PassengerRideCard key={ride._id} ride={ride} onLeave={leaveRide} />)}
                </div>
            )}
        </div>
    );
}
