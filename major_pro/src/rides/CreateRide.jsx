import React, { useState, useEffect } from "react";
import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";
import api from "../api/api";
import LocationPicker from "../components/LocationPicker";
import toast from "react-hot-toast";
import { GoogleMap, useJsApiLoader, Polyline, Marker } from "@react-google-maps/api";

const mapContainerStyle = {
  height: "300px",
  width: "100%",
};

const libraries = GOOGLE_MAPS_LIBRARIES;

export default function CreateRide() {
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
  const [vehicleInfo, setVehicleInfo] = useState({ model: "", color: "", licensePlate: "" });
  const [loading, setLoading] = useState(false);
  const [routeData, setRouteData] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

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
        vehicleInfo
      });

      toast.success("Ride created successfully! 🚗");
      resetForm();
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
    setVehicleInfo({ model: "", color: "", licensePlate: "" });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <LocationPicker
              label="Starting From"
              onChange={setStartLocation}
              initialValue={startLocation}
            />
            <LocationPicker
              label="Going To"
              onChange={setEndLocation}
              initialValue={endLocation}
            />
            <button
              disabled={!startLocation || !endLocation}
              onClick={() => setStep(2)}
              className="glass-button w-full py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span>Next: Journey Details</span>
              <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 animate-in slide-in-from-right duration-500">
            {/* PREMIUM DATE PICKER */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase text-gray-400 tracking-widest ml-1">Departure Date</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-2xl">
                {['today', 'tomorrow', 'custom'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`py-3 rounded-xl font-bold text-xs uppercase transition-all ${selectedDate === d ? 'bg-white text-red-600 shadow-sm scale-100' : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {selectedDate === 'custom' && (
                <input
                  type="date"
                  className="glass-input animate-in slide-in-from-top duration-300"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                />
              )}
            </div>

            {/* PREMIUM TIME SCROLL WHEEL (Simulated with tactile buttons) */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase text-gray-400 tracking-widest ml-1">Departure Time</label>
              <div className="flex items-center justify-center gap-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setHour(h => String((parseInt(h) % 12) + 1).padStart(2, '0'))} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-gray-400">▲</button>
                  <span className="text-4xl font-black text-gray-800 tracking-tighter">{hour}</span>
                  <button onClick={() => setHour(h => String((parseInt(h) - 2 + 12) % 12 + 1).padStart(2, '0'))} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-gray-400">▼</button>
                </div>
                <span className="text-4xl font-black text-red-500 mb-1">:</span>
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setMinute(m => String((parseInt(m) + 5) % 60).padStart(2, '0'))} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-gray-400">▲</button>
                  <span className="text-4xl font-black text-gray-800 tracking-tighter">{minute}</span>
                  <button onClick={() => setMinute(m => String((parseInt(m) - 5 + 60) % 60).padStart(2, '0'))} className="p-2 hover:bg-gray-100 rounded-full transition-colors font-bold text-gray-400">▼</button>
                </div>
                <button
                  onClick={() => setPeriod(p => p === "AM" ? "PM" : "AM")}
                  className="ml-4 px-4 py-3 bg-white border border-gray-100 rounded-xl font-black text-red-600 shadow-sm hover:scale-105 transition-all text-sm"
                >
                  {period}
                </button>
              </div>
            </div>

            {/* PREMIUM SEAT STEPPER */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase text-gray-400 tracking-widest ml-1">Available Seats</label>
              <div className="flex items-center justify-between p-2 bg-white border-2 border-gray-100 rounded-[2rem] shadow-sm">
                <button
                  onClick={() => setSeats(Math.max(1, seats - 1))}
                  className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-2xl font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-3xl font-black text-gray-800">{seats}</span>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Passenger{seats > 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setSeats(Math.min(10, seats + 1))}
                  className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-2xl font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-6">
              <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <span>🚘</span> Vehicle Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 ml-1">MODEL</label>
                  <input
                    placeholder="Tesla Model 3"
                    className="glass-input-sm bg-white"
                    value={vehicleInfo.model}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 ml-1">COLOR</label>
                  <input
                    placeholder="Midnight Silver"
                    className="glass-input-sm bg-white"
                    value={vehicleInfo.color}
                    onChange={(e) => setVehicleInfo({ ...vehicleInfo, color: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="glass-button-secondary py-4 flex-1">BACK</button>
              <button
                disabled={!vehicleInfo.model}
                onClick={() => setStep(3)}
                className="glass-button py-4 flex-[2] font-black"
              >
                REVIEW ROUTE →
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
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-2xl mx-auto">
        {/* PROGRESS MINI BAR */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= s ? 'bg-red-500 shadow-sm shadow-red-200' : 'bg-gray-200'
              }`} />
          ))}
        </div>

        <div className="glass-card p-1 shadow-2xl">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100">
            <header className="mb-10">
              <h2 className="text-4xl font-black text-gray-800 mb-2 tracking-tight">
                {step === 1 ? "Start a Journey" : step === 2 ? "Journey Details" : "Final Checklist"}
              </h2>
              <p className="text-gray-400 font-bold text-sm tracking-wide">
                {step === 1 ? "LET'S MAP OUT YOUR ROUTE" :
                  step === 2 ? "CONFIGURE TIME AND VEHICLE" :
                    "VERIFY ESTIMATED METRICS"}
              </p>
            </header>

            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
