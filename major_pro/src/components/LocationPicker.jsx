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
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

export default function LocationPicker({ label, onChange, initialValue, showFavorites = true }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const { user } = useUser();
  const [marker, setMarker] = useState(null);
  const [map, setMap] = useState(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (initialValue && initialValue.lat && initialValue.lng) {
      setMarker({ lat: initialValue.lat, lng: initialValue.lng });
    }
  }, [initialValue]);

  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    onChange({ lat, lng, address: "Selected on map" });
  }, [onChange]);

  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry || !place.geometry.location) {
      toast.error("No location found for this place");
      return;
    }

    const loc = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };

    setMarker(loc);
    map.panTo(loc);
    map.setZoom(15);
    onChange({ ...loc, address: place.formatted_address });
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
    toast.success(`${type === 'home' ? '🏠 Home' : '💼 Work'} selected`);
  };

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  if (loadError) return <div className="p-4 text-red-500 bg-red-50 rounded-xl">Error loading Google Maps</div>;
  if (!isLoaded) return <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400 font-medium italic">Loading Map...</div>;

  return (
    <div className="space-y-3 relative">
      <div className="flex justify-between items-center px-1">
        <p className="text-sm font-bold text-gray-700">{label}</p>

        {showFavorites && user && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFavorite('home')}
              className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              title="Home"
            >
              🏠
            </button>
            <button
              type="button"
              onClick={() => setFavorite('work')}
              className="w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              title="Work"
            >
              💼
            </button>
          </div>
        )}
      </div>

      <div className="relative group">
        <Autocomplete
          onLoad={(ref) => (autocompleteRef.current = ref)}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            type="text"
            placeholder="Search for a place..."
            className="absolute top-4 left-4 right-4 z-10 p-3 rounded-xl border-none shadow-xl bg-white/95 backdrop-blur-sm text-sm font-medium focus:ring-2 focus:ring-red-500 transition-all outline-none"
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
        </Autocomplete>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={initialValue ? 15 : 13}
          center={marker || defaultCenter}
          onClick={onMapClick}
          onLoad={onLoad}
          options={mapOptions}
          mapContainerClassName="rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
        >
          {marker && window.google?.maps?.Animation && (
            <Marker
              position={marker}
              animation={window.google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>
      </div>

      <p className="text-[10px] text-gray-400 font-medium ml-1">
        Tip: Search above or drop a pin directly on the map
      </p>
    </div>
  );
}
