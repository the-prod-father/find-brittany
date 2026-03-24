"use client";

import { useCallback, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import type { Sighting, TimelineEvent } from "@/lib/types";

const MAP_ID = "investigation-map";

// Known investigation locations
const KEY_LOCATIONS = [
  {
    id: "last-seen",
    lat: 40.8728,
    lng: -73.534,
    title: "Last Seen — McCouns Lane",
    description: "8:14 PM, March 20, 2026",
    pinColor: "#ef4444",
    isPrimary: true,
  },
  {
    id: "ivy-street",
    lat: 40.8705,
    lng: -73.531,
    title: "Ivy Street",
    description: "Missing poster address",
    pinColor: "#eab308",
  },
  {
    id: "lirr",
    lat: 40.866,
    lng: -73.533,
    title: "Oyster Bay LIRR Station",
    description: "~0.4 mi from last seen",
    pinColor: "#3b82f6",
  },
  {
    id: "mill-pond",
    lat: 40.8645,
    lng: -73.529,
    title: "Mill Pond / Beekman Beach",
    description: "Waterway south of downtown",
    pinColor: "#22c55e",
  },
  {
    id: "tr-park",
    lat: 40.868,
    lng: -73.537,
    title: "Theodore Roosevelt Memorial Park",
    description: "Wooded/waterfront area",
    pinColor: "#22c55e",
  },
  {
    id: "harbor",
    lat: 40.863,
    lng: -73.536,
    title: "Oyster Bay Harbor",
    description: "Harbor area",
    pinColor: "#22c55e",
  },
];

interface InvestigationMapProps {
  sightings: Sighting[];
  timelineEvents: TimelineEvent[];
  selectedEventId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapContent({
  sightings,
  selectedEventId,
  onMapClick,
}: {
  sightings: Sighting[];
  selectedEventId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  // Pan to selected event location
  const prevSelectedRef = useRef<string | null>(null);
  if (selectedEventId && selectedEventId !== prevSelectedRef.current && map) {
    prevSelectedRef.current = selectedEventId;
    // Find the matching location
    const loc = KEY_LOCATIONS.find((l) => l.id === selectedEventId);
    if (loc) {
      map.panTo({ lat: loc.lat, lng: loc.lng });
      map.setZoom(17);
      setActiveMarker(loc.id);
    }
    // Check sightings too
    const sighting = sightings.find((s) => s.id === selectedEventId);
    if (sighting) {
      map.panTo({ lat: sighting.latitude, lng: sighting.longitude });
      map.setZoom(17);
      setActiveMarker(sighting.id);
    }
  }

  // Build the movement path from sightings (chronological)
  const sortedSightings = [...sightings]
    .filter((s) => s.verified)
    .sort(
      (a, b) =>
        new Date(a.sighting_date).getTime() -
        new Date(b.sighting_date).getTime()
    );

  // Draw search radius circles via the map
  const drawCircles = useCallback(() => {
    if (!map) return;
    const center = { lat: 40.8728, lng: -73.534 };
    const radii = [
      { meters: 402, label: "0.25 mi", opacity: 0.15 },
      { meters: 805, label: "0.5 mi", opacity: 0.1 },
      { meters: 1609, label: "1 mi", opacity: 0.06 },
    ];

    radii.forEach((r) => {
      new google.maps.Circle({
        map,
        center,
        radius: r.meters,
        strokeColor: "#ef4444",
        strokeOpacity: 0.4,
        strokeWeight: 1.5,
        fillColor: "#ef4444",
        fillOpacity: r.opacity,
        clickable: false,
      });
    });

    // Draw movement path polyline
    if (sortedSightings.length > 1) {
      const path = sortedSightings.map((s) => ({
        lat: s.latitude,
        lng: s.longitude,
      }));
      new google.maps.Polyline({
        map,
        path,
        strokeColor: "#e94560",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        geodesic: true,
        icons: [
          {
            icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
            offset: "50%",
          },
        ],
      });
    }
  }, [map, sortedSightings]);

  // Draw circles once map is ready
  if (map) {
    // Use a flag to avoid re-drawing
    const mapDiv = map.getDiv();
    if (!mapDiv.dataset.circlesDrawn) {
      mapDiv.dataset.circlesDrawn = "true";
      drawCircles();
    }
  }

  const confidenceColor = (confidence: string) => {
    switch (confidence) {
      case "confirmed":
        return "#ef4444";
      case "likely":
        return "#f97316";
      case "possible":
        return "#eab308";
      default:
        return "#8888a0";
    }
  };

  return (
    <>
      {/* Key investigation locations */}
      {KEY_LOCATIONS.map((loc) => (
        <AdvancedMarker
          key={loc.id}
          position={{ lat: loc.lat, lng: loc.lng }}
          onClick={() => setActiveMarker(activeMarker === loc.id ? null : loc.id)}
        >
          <Pin
            background={loc.pinColor}
            borderColor={loc.isPrimary ? "#ffffff" : loc.pinColor}
            glyphColor="#ffffff"
            scale={loc.isPrimary ? 1.4 : 1.0}
          />
          {activeMarker === loc.id && (
            <InfoWindow
              position={{ lat: loc.lat, lng: loc.lng }}
              onCloseClick={() => setActiveMarker(null)}
            >
              <div style={{ color: "#000", maxWidth: 200 }}>
                <strong>{loc.title}</strong>
                <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                  {loc.description}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#666" }}>
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </p>
                <a
                  href={`https://www.google.com/maps/@${loc.lat},${loc.lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0x0:0x0!2e0!7i16384!8i8192`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: "#3b82f6" }}
                >
                  Open Street View
                </a>
              </div>
            </InfoWindow>
          )}
        </AdvancedMarker>
      ))}

      {/* Database sightings */}
      {sightings.map((s) => (
        <AdvancedMarker
          key={s.id}
          position={{ lat: s.latitude, lng: s.longitude }}
          onClick={() => setActiveMarker(activeMarker === s.id ? null : s.id)}
        >
          <Pin
            background={confidenceColor(s.confidence)}
            borderColor={confidenceColor(s.confidence)}
            glyphColor="#ffffff"
            scale={0.9}
          />
          {activeMarker === s.id && (
            <InfoWindow
              position={{ lat: s.latitude, lng: s.longitude }}
              onCloseClick={() => setActiveMarker(null)}
            >
              <div style={{ color: "#000", maxWidth: 220 }}>
                <strong>{s.description}</strong>
                <p style={{ margin: "4px 0", fontSize: 12 }}>
                  {new Date(s.sighting_date).toLocaleString()}
                </p>
                {s.clothing_description && (
                  <p style={{ fontSize: 11, color: "#666" }}>
                    Wearing: {s.clothing_description}
                  </p>
                )}
                {s.demeanor && (
                  <p style={{ fontSize: 11, color: "#666" }}>
                    Demeanor: {s.demeanor}
                  </p>
                )}
                <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                  Confidence: {s.confidence}
                </p>
              </div>
            </InfoWindow>
          )}
        </AdvancedMarker>
      ))}
    </>
  );
}

export default function InvestigationMap({
  sightings,
  timelineEvents,
  selectedEventId,
  onMapClick,
}: InvestigationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-[#0f0f1a] flex items-center justify-center">
        <p className="text-[#8888a0]">Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={{ lat: 40.87, lng: -73.532 }}
        defaultZoom={15}
        mapId={MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={true}
        streetViewControl={true}
        fullscreenControl={true}
        zoomControl={true}
        style={{ width: "100%", height: "100%" }}
        colorScheme="DARK"
        onClick={(e) => {
          if (onMapClick && e.detail.latLng) {
            onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
          }
        }}
      >
        <MapContent
          sightings={sightings}
          selectedEventId={selectedEventId}
          onMapClick={onMapClick}
        />
      </Map>
    </APIProvider>
  );
}
