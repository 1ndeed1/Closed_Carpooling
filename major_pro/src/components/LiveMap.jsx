import { useEffect, useState } from "react";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import api from "../api/api";

const mapContainerStyle = { height: "400px", width: "100%" };
const defaultCenter = { lat: 12.9716, lng: 77.5946 };

export default function LiveMap() {
    const [activeRides, setActiveRides] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
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

    if (!isLoaded) return <div className="h-[200px] bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center font-bold text-gray-400">LOADING LIVE GRID...</div>;

    const baseMapStyle = { height: isExpanded ? "80vh" : "200px", width: "100%", transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" };

    return (
        <>
            {/* Dark Backdrop for Expanded Mode */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] animate-fade-in"
                    onClick={() => setIsExpanded(false)}
                />
            )}

            <div
                className={`glass-card overflow-hidden border border-white/60 shadow-2xl transition-all duration-500 ${isExpanded ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-6xl z-[1000] scale-100' : 'relative w-full hover:scale-[1.01] cursor-zoom-in'}`}
                onClick={() => !isExpanded && setIsExpanded(true)}
            >
                {isExpanded && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                        className="absolute top-4 right-4 z-[1001] bg-white/90 p-2 rounded-full shadow-lg hover:bg-white transition-colors"
                    >
                        ✕
                    </button>
                )}

                <GoogleMap
                    mapContainerStyle={baseMapStyle}
                    zoom={isExpanded ? 13 : 12}
                    center={activeRides.length > 0 ? (activeRides[0].currentLocation || activeRides[0].startLocation) : defaultCenter}
                    options={{
                        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
                        disableDefaultUI: true,
                        zoomControl: true,
                    }}
                >
                    {activeRides.map((ride) => (
                        <div key={ride._id}>
                            <Marker
                                position={ride.currentLocation || ride.startLocation}
                                icon={{
                                    url: "https://cdn-icons-png.flaticon.com/512/3082/3082331.png",
                                    scaledSize: new window.google.maps.Size(30, 30),
                                }}
                            />
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
                                        strokeOpacity: 0.6,
                                        strokeWeight: 4,
                                    }}
                                />
                            )}
                            <Marker position={ride.endLocation} icon={{ url: "https://cdn-icons-png.flaticon.com/512/149/149060.png", scaledSize: new window.google.maps.Size(20, 20) }} />
                        </div>
                    ))}
                </GoogleMap>

                <div className="bg-white p-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        {isExpanded ? 'Full Command View' : 'Live Preview'}: <span className="text-red-600">{activeRides.length} Active</span>
                    </p>
                    {!isExpanded && <span className="text-[10px] font-black text-gray-300">CLICK TO EXPAND</span>}
                </div>
            </div>
        </>
    );
}
