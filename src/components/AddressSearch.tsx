"use client";

import { useEffect, useRef, useState } from "react";

interface AddressSearchProps {
  onSelect: (result: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  defaultValue?: string;
}

export default function AddressSearch({
  onSelect,
  placeholder = "Search address or location...",
  defaultValue = "",
}: AddressSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    // Load Google Maps Places library
    if (!window.google?.maps?.places) {
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (!existing) {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.onload = () => setLoaded(true);
        document.head.appendChild(script);
      } else {
        // Script exists, wait for it
        const check = setInterval(() => {
          if (window.google?.maps?.places) {
            setLoaded(true);
            clearInterval(check);
          }
        }, 100);
        return () => clearInterval(check);
      }
    } else {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !inputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["address"],
        componentRestrictions: { country: "us" },
        fields: ["formatted_address", "geometry"],
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location && place.formatted_address) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setValue(place.formatted_address);
        onSelect({
          address: place.formatted_address,
          lat,
          lng,
        });
      }
    });
  }, [loaded, onSelect]);

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-sm"
      />
    </div>
  );
}
