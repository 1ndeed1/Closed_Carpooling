import { useEffect, useState } from "react";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import api from "../api/api";

const mapContainerStyle = { height: "400px", width: "100%" };
const defaultCenter = { lat: 12.9716, lng: 77.5946 };

export default function LiveMap() {
    const [activeRides, setActiveRides] = useState([]);
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    useEffect(() => {
        const fetchActive = async () => {
            try {
                const res = await api.get("/rides/active");
                setActiveRides(res.data);
            } catch (err) {
                console.error("Live map fetch failed");
            }
        };

        fetchActive();
        const interval = setInterval(fetchActive, 10000); // 10s refresh
        return () => clearInterval(interval);
    }, []);

    if (!isLoaded) return <div className="h-[400px] bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center font-bold text-gray-400">LOADING LIVE GRID...</div>;

    return (
        <div className="glass-card overflow-hidden border border-white/60 shadow-2xl">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={activeRides.length > 0 ? (activeRides[0].currentLocation || activeRides[0].startLocation) : defaultCenter}
                options={{
                    styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
                    disableDefaultUI: true,
                    zoomControl: true,
                }}
            >
                {activeRides.map((ride) => (
                    <div key={ride._id}>
                        {/* The actual moving car */}
                        <Marker
                            position={ride.currentLocation || ride.startLocation}
                            icon={{
                                url: "https://cdn-icons-png.flaticon.com/512/3082/3082331.png", // Small car icon
                                scaledSize: new window.google.maps.Size(30, 30),
                            }}
                            label={{
                                text: ride.driver?.name || "Driver",
                                className: "bg-white/80 px-2 py-1 rounded text-[10px] font-bold shadow-sm translate-y-8 border border-gray-100",
                            }}
                        />
                        {/* The route they are following */}
                        {ride.routePolyline && window.google?.maps?.geometry?.encoding && (
                            <Polyline
                                path={(function () {
                                    try {
                                        return window.google.maps.geometry.encoding.decodePath(ride.routePolyline);
                                    } catch (e) {
                                        return [];
                                    }
                                })()}
                                options={{
                                    strokeColor: "#ef4444",
                                    strokeOpacity: 0.4,
                                    strokeWeight: 3,
                                }}
                            />
                        )}
                        <Marker position={ride.endLocation} icon={{ url: "https://cdn-icons-png.flaticon.com/512/149/149060.png", scaledSize: new window.google.maps.Size(20, 20) }} />
                    </div>
                ))}
            </GoogleMap>

            <div className="bg-white p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    Live Monitoring: <span className="text-red-600">{activeRides.length} Active Journeys</span>
                </p>
                <div className="flex gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-[10px] font-bold text-gray-400">REALTIME</span>
                </div>
            </div>
        </div>
    );
}
