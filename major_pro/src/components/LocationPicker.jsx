import React, { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import { useUser } from "./UserContext";
import toast from "react-hot-toast";

import { GOOGLE_MAPS_LIBRARIES } from "../api/googleMapsConfig";

const libraries = GOOGLE_MAPS_LIBRARIES;
const mapContainerStyle = {
  height: "300px",
  width: "100%",
};
const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946, // Bengaluru
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false, // Keep it super simple for preview
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

export default function LocationPicker({ label, onChange, value, showFavorites = true }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const { user } = useUser();
  const [marker, setMarker] = useState(null);
  const [map, setMap] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const autocompleteRef = useRef(null);

  // Sync internal marker with external value
  useEffect(() => {
    if (value && value.lat && value.lng) {
      setMarker({ lat: value.lat, lng: value.lng });
    } else {
      setMarker(null);
    }
  }, [value?.lat, value?.lng]);

  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    onChange({ lat, lng, address: "Selected on map" });
  }, [onChange]);

  const onPlaceChanged = () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry || !place.geometry.location) {
      // If user typed something but didn't pick, try manual geocoding
      handleManualSearch(value.address);
      return;
    }

    const loc = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setMarker(loc);
    if (map) {
      map.panTo(loc);
      map.setZoom(16);
    }
    onChange({ ...loc, address: place.formatted_address || place.name });
    setShowMap(true); // Keep map visible to confirm
  };

  const handleManualSearch = async (address) => {
    if (!address || !window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results[0]) {
        const loc = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        };
        setMarker(loc);
        if (map) {
          map.panTo(loc);
          map.setZoom(16);
        }
        onChange({ ...loc, address: results[0].formatted_address });
        setShowMap(true);
      } else {
        toast.error("Location not found. Please be more specific.");
      }
    });
  };

  const setFavorite = (type) => {
    if (!user) {
      toast.error("Please log in to use favorite places");
      return;
    }
    const loc = type === 'home' ? user.homeLocation : user.workLocation;
    if (!loc || !loc.lat) {
      toast.error(`Please set your ${type} location in Profile first!`);
      return;
    }
    const simplified = { lat: loc.lat, lng: loc.lng };
    setMarker(simplified);
    if (map) {
      map.panTo(simplified);
      map.setZoom(16);
    }
    onChange({ ...simplified, address: loc.address });
    setShowMap(true);
    toast.success(`${type === 'home' ? '🏠 Home' : '💼 Work'} selected`);
  };

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  if (loadError) return <div className="p-4 text-red-500 bg-red-50 rounded-xl font-bold uppercase text-[10px]">Error loading Maps</div>;
  if (!isLoaded) return <div className="h-14 w-full bg-gray-50 animate-pulse rounded-2xl" />;

  return (
    <div className="space-y-3 relative group">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showMap ? "bg-red-500 text-white shadow-lg shadow-red-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            title="Toggle Map"
          >
            🗺️
          </button>
          {showFavorites && user && (
            <>
              <button
                type="button"
                onClick={() => setFavorite('home')}
                className="w-8 h-8 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all font-bold"
                title="Home"
              >
                🏠
              </button>
              <button
                type="button"
                onClick={() => setFavorite('work')}
                className="w-8 h-8 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all font-bold"
                title="Work"
              >
                💼
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative space-y-3">
        <div className="relative group/input">
          <Autocomplete
            onLoad={(ref) => (autocompleteRef.current = ref)}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              type="text"
              value={value?.address || ""}
              onChange={(e) => onChange({ address: e.target.value })} // Clear lat/lng on manual edit
              placeholder={`Search ${label}...`}
              className="w-full bg-white border-2 border-gray-100 p-4 pr-14 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-200 transition-all shadow-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleManualSearch(value.address);
                }
              }}
            />
          </Autocomplete>
          <button
            type="button"
            onClick={() => handleManualSearch(value.address)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-gray-50 text-gray-400 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all"
          >
            🔍
          </button>
        </div>

        {showMap && (
          <div className="animate-in slide-in-from-top-4 duration-500 h-[220px] w-full rounded-2xl overflow-hidden border-2 border-gray-100 shadow-inner relative">
            <GoogleMap
              mapContainerStyle={{ height: "100%", width: "100%" }}
              zoom={value?.lat ? 16 : 13}
              center={marker || defaultCenter}
              onClick={onMapClick}
              onLoad={onLoad}
              options={mapOptions}
            >
              {marker && (
                <Marker
                  position={marker}
                  animation={window.google?.maps?.Animation?.DROP}
                />
              )}
            </GoogleMap>
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm pointer-events-none">
              <p className="text-[10px] font-black text-gray-800 uppercase">Click to Lock Location</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
