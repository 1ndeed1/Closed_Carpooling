import React, { useState, useEffect } from "react";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import api from "../api/api";
import LocationPicker from "../components/LocationPicker";
import toast from "react-hot-toast";
import { useUser } from "../components/UserContext";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";

const mapContainerStyle = {
  height: "300px",
  width: "100%",
};

const libraries = GOOGLE_MAPS_LIBRARIES;

export default function CreateRide() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);

  // Premium Time Picker State
  const [selectedDate, setSelectedDate] = useState("today"); // today, tomorrow, custom
  const [customDate, setCustomDate] = useState("");
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("AM");

  const [seats, setSeats] = useState(1);
  const [visibility, setVisibility] = useState("organization");
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Force Friend Pool if no organization approval
  useEffect(() => {
    if (user && user.orgStatus !== "approved") {
      setVisibility("friends");
    }
  }, [user]);

  // Calculate route preview when locations change
  useEffect(() => {
    if (startLocation && endLocation && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: startLocation.lat, lng: startLocation.lng },
          destination: { lat: endLocation.lat, lng: endLocation.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setRouteData({
              polyline: result.routes[0].overview_polyline,
              distance: result.routes[0].legs[0].distance.text,
              duration: result.routes[0].legs[0].duration.text,
              bounds: result.routes[0].bounds
            });
          } else {
            console.error("Directions Request failed:", status);
            // Fallback: simplified data if API fails (so UI doesn't hang)
            if (status === "REQUEST_DENIED") {
              toast.error("Map route service not enabled. Please enable Directions API in Google Cloud Console.");
            }
            // Set minimal data to allow user to proceed if possible or show error state
            setRouteData({ error: status });
          }
        }
      );
    }
  }, [startLocation, endLocation, isLoaded]);

  const getFinalDateTime = () => {
    let date = new Date();
    if (selectedDate === "tomorrow") date.setDate(date.getDate() + 1);
    else if (selectedDate === "custom" && customDate) date = new Date(customDate);

    let h = parseInt(hour);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;

    date.setHours(h, parseInt(minute), 0, 0);
    return date.toISOString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/rides", {
        startLocation,
        endLocation,
        time: getFinalDateTime(),
        seats,
        visibility,
        vehicleInfo: user.vehicleInfo
      });

      toast.success("Ride created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ride");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setStartLocation(null);
    setEndLocation(null);
    setSelectedDate("today");
    setHour("09");
    setMinute("00");
    setSeats(1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-700 fade-in">
            <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 space-y-6">
              <LocationPicker
                label="Starting Location"
                onChange={setStartLocation}
                value={startLocation}
              />
              <div className="relative py-2 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100 border-dashed"></div>
                </div>
                <div className="relative w-10 h-10 bg-white rounded-full border border-gray-100 flex items-center justify-center text-xs shadow-sm">
                  ⬇️
                </div>
              </div>
              <LocationPicker
                label="Destination"
                onChange={setEndLocation}
                value={endLocation}
              />
            </div>
            <button
              disabled={!startLocation || !endLocation}
              onClick={() => setStep(2)}
              className="glass-button w-full py-5 text-lg font-black tracking-widest disabled:opacity-50 disabled:grayscale transition-all hover:scale-[1.02] active:scale-95 group"
            >
              <span>CONFIGURE TRIP</span>
              <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 animate-in slide-in-from-right-10 duration-700 fade-in">
            <div className="bg-gray-50/50 p-7 rounded-[2.5rem] border border-gray-100 space-y-8">
              {/* PREMIUM DATE PICKER */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Departure Schedule</label>
                <div className="flex gap-2 p-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  {['today', 'tomorrow', 'custom'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${selectedDate === d ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {selectedDate === 'custom' && (
                  <input
                    type="date"
                    className="w-full bg-white border-2 border-gray-100 p-4 rounded-xl text-sm font-bold animate-in slide-in-from-top-2 duration-300"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                )}
              </div>

              {/* PREMIUM TIME SCROLL WHEEL */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Time of Departure</label>
                <div className="flex items-center justify-center gap-6 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-red-50/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={() => setHour(h => String((parseInt(h) % 12) + 1).padStart(2, '0'))} className="text-[8px] hover:text-red-500 transition-colors font-black">▲</button>
                    <span className="text-4xl font-black text-gray-800 tracking-tighter">{hour}</span>
                    <button onClick={() => setHour(h => String((parseInt(h) - 2 + 12) % 12 + 1).padStart(2, '0'))} className="text-[8px] hover:text-red-500 transition-colors font-black">▼</button>
                  </div>
                  <span className="text-3xl font-black text-red-500 mb-1 animate-pulse">:</span>
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={() => setMinute(m => String((parseInt(m) + 5) % 60).padStart(2, '0'))} className="text-[8px] hover:text-red-500 transition-colors font-black">▲</button>
                    <span className="text-4xl font-black text-gray-800 tracking-tighter">{minute}</span>
                    <button onClick={() => setMinute(m => String((parseInt(m) - 5 + 60) % 60).padStart(2, '0'))} className="text-[8px] hover:text-red-500 transition-colors font-black">▼</button>
                  </div>
                  <button
                    onClick={() => setPeriod(p => p === "AM" ? "PM" : "AM")}
                    className={`ml-4 px-5 py-3 rounded-xl font-black text-xs tracking-widest transition-all ${period === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-gray-800 text-white'
                      }`}
                  >
                    {period}
                  </button>
                </div>
              </div>

              {/* PREMIUM SEAT STEPPER */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Available Capacity</label>
                <div className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                  <button
                    onClick={() => setSeats(Math.max(1, seats - 1))}
                    className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-xl font-black text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-black text-gray-800 tracking-tighter">{seats}</span>
                    <p className="text-[8px] uppercase font-black text-gray-400 tracking-widest mt-0.5">Seat{seats > 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setSeats(Math.min(10, seats + 1))}
                    className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-xl font-black text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* PREMIUM POOL TYPE SELECTOR */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] ml-1">Ride Pool Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={user.orgStatus !== "approved"}
                    onClick={() => setVisibility("organization")}
                    className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center text-center relative ${visibility === "organization" ? "border-red-500 bg-red-50/50 shadow-md shadow-red-100/50 scale-[1.02]" : "border-gray-100 bg-white hover:border-red-200"} ${user.orgStatus !== "approved" ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
                  >
                    {user.orgStatus !== "approved" && (
                      <div className="absolute top-2 right-2 text-[8px] bg-gray-800 text-white px-1.5 py-0.5 rounded font-black tracking-widest">LOCKED</div>
                    )}
                    <div className="text-2xl mb-2">🏢</div>
                    <div className="font-black text-gray-800 text-xs uppercase tracking-widest">Organization</div>
                    <div className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Colleagues</div>
                  </button>
                  <button
                    onClick={() => setVisibility("friends")}
                    className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center justify-center text-center ${visibility === "friends" ? "border-amber-500 bg-amber-50/50 shadow-md shadow-amber-100/50 scale-[1.02]" : "border-gray-100 bg-white hover:border-amber-200"}`}
                  >
                    <div className="text-2xl mb-2">🤝</div>
                    <div className="font-black text-gray-800 text-xs uppercase tracking-widest">Friend Pool</div>
                    <div className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Close Circle</div>
                  </button>
                </div>
                {user.orgStatus !== "approved" && (
                  <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest text-center animate-pulse">
                    ⚠️ Organization Pool requires an approved workplace status
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-8 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 bg-gray-100/50 flex-1 transition-all">Back</button>
              <button
                onClick={() => setStep(3)}
                className="glass-button py-5 flex-[2] font-black tracking-widest hover:scale-[1.02] active:scale-95"
              >
                PREVIEW ROUTE →
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in zoom-in duration-500">
            <div className="glass-card overflow-hidden border-2 border-red-50">
              {isLoaded && routeData && !routeData.error && routeData.polyline ? (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={startLocation}
                  zoom={12}
                  options={{ disableDefaultUI: true, zoomControl: true }}
                  onLoad={(map) => routeData.bounds && map.fitBounds(routeData.bounds)}
                >
                  <Marker position={startLocation} label="A" />
                  <Marker position={endLocation} label="B" />
                  {window.google?.maps?.geometry?.encoding && (
                    <Polyline
                      path={window.google.maps.geometry.encoding.decodePath(routeData.polyline)}
                      options={{
                        strokeColor: "#ef4444",
                        strokeWeight: 4,
                      }}
                    />
                  )}
                </GoogleMap>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center bg-gray-50 p-6 text-center space-y-2">
                  <span className="text-3xl">📍</span>
                  <p className="text-sm font-bold text-gray-500 italic">
                    {routeData?.error === "REQUEST_DENIED"
                      ? "Route preview unavailable (Map module not activated)"
                      : "Calculating route..."}
                  </p>
                </div>
              )}

              <div className="p-8 bg-white">
                <div className="flex justify-between items-center mb-6">
                  <div className="bg-gray-50 p-4 rounded-2xl flex-1 mr-2 border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distance</p>
                    <p className="text-xl font-black text-gray-800">{routeData?.distance || "..."}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl flex-1 ml-2 border border-red-100">
                    <p className="text-[10px] font-black text-red-300 uppercase tracking-widest">Duration</p>
                    <p className="text-xl font-black text-red-600">{routeData?.duration || "..."}</p>
                  </div>
                </div>

                {routeData?.error && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-1">⚠️ Service Limitation</p>
                    <p className="text-sm text-amber-600 font-medium">
                      Precise distance/duration couldn't be calculated. Don't worry, the ride will still be created accurately!
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <p className="text-sm text-gray-500 font-medium truncate">{startLocation?.address}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <p className="text-sm text-gray-800 font-bold truncate">{endLocation?.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="glass-button-secondary py-4 flex-1">BACK</button>
              <button
                disabled={loading}
                onClick={handleSubmit}
                className={`glass-button py-4 flex-[2] font-black tracking-widest ${loading ? 'animate-pulse' : ''}`}
              >
                {loading ? "PUBLISHING..." : "POST JOURNEY 🚀"}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 to-white selection:bg-red-100">
      <div className="max-w-xl mx-auto py-10">
        {/* PROGRESS MINI BAR */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex flex-1 gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= s ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-gray-200'
                }`} />
            ))}
          </div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest w-12 text-right">Step {step}/3</p>
        </div>

        <div className="glass-card overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border-white/60">
          <div className="bg-white/80 backdrop-blur-3xl p-8 md:p-12">
            <header className="mb-10 text-center animate-in slide-in-from-top-4 duration-700">
              <h2 className="text-4xl font-black text-gray-800 mb-2 tracking-tighter">
                {step === 1 ? "Start a Journey" : step === 2 ? "Journey Details" : "Ready to Roll?"}
              </h2>
              <p className="text-[10px] font-black uppercase text-red-500/60 tracking-[0.3em] font-mono">
                {step === 1 ? "Pick your waypoints" :
                  step === 2 ? "Finalize your schedule" :
                    "Confirm trip parameters"}
              </p>
            </header>

            {renderStep()}
          </div>
        </div>

        <p className="text-center mt-8 text-[10px] font-black uppercase text-gray-400 tracking-widest opacity-50">
          © {new Date().getFullYear()} Major Pro • Closed Carpooling
        </p>
      </div>
    </div>
  );
}
