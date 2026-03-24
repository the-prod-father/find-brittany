"use client";

import { useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import type { Sighting, TimelineEvent, Evidence, Tip } from "@/lib/types";

const MAP_ID = "investigation-map";

const KEY_LOCATIONS = [
  { id: "last-seen", lat: 40.8728, lng: -73.534, title: "Last Seen — McCouns Lane", description: "8:14 PM, March 20, 2026", pinColor: "#ef4444", isPrimary: true },
  { id: "ivy-street", lat: 40.8705, lng: -73.531, title: "Ivy Street", description: "Missing poster address", pinColor: "#eab308" },
  { id: "lirr", lat: 40.866, lng: -73.533, title: "Oyster Bay LIRR Station", description: "~0.4 mi from last seen", pinColor: "#3b82f6" },
  { id: "mill-pond", lat: 40.8645, lng: -73.529, title: "Mill Pond / Beekman Beach", description: "Waterway south of downtown", pinColor: "#22c55e" },
  { id: "tr-park", lat: 40.868, lng: -73.537, title: "Theodore Roosevelt Park", description: "Wooded/waterfront", pinColor: "#22c55e" },
  { id: "harbor", lat: 40.863, lng: -73.536, title: "Oyster Bay Harbor", description: "Harbor area", pinColor: "#22c55e" },
];

const LAST_SEEN = { lat: 40.8728, lng: -73.534 };

// Walking speed time-distance circles
const TIME_CIRCLES = [
  { minutes: 16, label: "8:30 PM", color: "#ef4444", opacity: 0.08 },
  { minutes: 46, label: "9:00 PM", color: "#f97316", opacity: 0.05 },
  { minutes: 226, label: "Midnight", color: "#eab308", opacity: 0.02 },
];

interface InvestigationMapProps {
  sightings: Sighting[];
  timelineEvents: TimelineEvent[];
  evidence?: Evidence[];
  tips?: Tip[];
  showTimeCircles?: boolean;
  showCoverage?: boolean;
}

function MapContent({
  sightings,
  evidence = [],
  tips = [],
  showTimeCircles = true,
  showCoverage = false,
}: {
  sightings: Sighting[];
  evidence: Evidence[];
  tips: Tip[];
  showTimeCircles: boolean;
  showCoverage: boolean;
}) {
  const map = useMap();
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const coverageRef = useRef<google.maps.Circle[]>([]);
  const drawnRef = useRef(false);

  // Draw time-distance circles
  useEffect(() => {
    if (!map) return;

    // Clear old circles
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    if (!showTimeCircles) return;

    TIME_CIRCLES.forEach((tc) => {
      const radiusMeters = (tc.minutes / 60) * 5000; // 5km/h walking speed
      const circle = new google.maps.Circle({
        map,
        center: LAST_SEEN,
        radius: radiusMeters,
        strokeColor: tc.color,
        strokeOpacity: 0.5,
        strokeWeight: 2,
        fillColor: tc.color,
        fillOpacity: tc.opacity,
        clickable: false,
      });
      circlesRef.current.push(circle);
    });

    return () => {
      circlesRef.current.forEach((c) => c.setMap(null));
    };
  }, [map, showTimeCircles]);

  // Draw coverage circles around evidence with GPS
  useEffect(() => {
    if (!map) return;

    coverageRef.current.forEach((c) => c.setMap(null));
    coverageRef.current = [];

    if (!showCoverage) return;

    evidence
      .filter((e) => e.latitude && e.longitude)
      .forEach((e) => {
        const circle = new google.maps.Circle({
          map,
          center: { lat: e.latitude!, lng: e.longitude! },
          radius: 100,
          strokeColor: "#22c55e",
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillColor: "#22c55e",
          fillOpacity: 0.1,
          clickable: false,
        });
        coverageRef.current.push(circle);
      });

    return () => {
      coverageRef.current.forEach((c) => c.setMap(null));
    };
  }, [map, showCoverage, evidence]);

  // Movement path polyline (draw once)
  useEffect(() => {
    if (!map || drawnRef.current) return;
    drawnRef.current = true;

    const sorted = [...sightings]
      .filter((s) => s.verified)
      .sort((a, b) => new Date(a.sighting_date).getTime() - new Date(b.sighting_date).getTime());

    if (sorted.length < 2) return;

    new google.maps.Polyline({
      map,
      path: sorted.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      strokeColor: "#e94560",
      strokeOpacity: 0.8,
      strokeWeight: 3,
      icons: [
        { icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, fillColor: "#e94560", fillOpacity: 1 }, offset: "50%" },
      ],
    });
  }, [map, sightings]);

  return (
    <>
      {/* Key locations */}
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
            <InfoWindow position={{ lat: loc.lat, lng: loc.lng }} onCloseClick={() => setActiveMarker(null)}>
              <div style={{ color: "#000", maxWidth: 200, fontSize: 13 }}>
                <strong>{loc.title}</strong>
                <p style={{ margin: "4px 0 0" }}>{loc.description}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#666" }}>
                  {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                </p>
              </div>
            </InfoWindow>
          )}
        </AdvancedMarker>
      ))}

      {/* Sighting markers */}
      {sightings.map((s) => (
        <AdvancedMarker
          key={`s-${s.id}`}
          position={{ lat: s.latitude, lng: s.longitude }}
          onClick={() => setActiveMarker(activeMarker === `s-${s.id}` ? null : `s-${s.id}`)}
        >
          <Pin
            background={s.confidence === "confirmed" ? "#ef4444" : s.confidence === "likely" ? "#f97316" : "#eab308"}
            glyphColor="#fff"
            scale={0.9}
          />
          {activeMarker === `s-${s.id}` && (
            <InfoWindow position={{ lat: s.latitude, lng: s.longitude }} onCloseClick={() => setActiveMarker(null)}>
              <div style={{ color: "#000", maxWidth: 220, fontSize: 13 }}>
                <strong>{s.description}</strong>
                <p style={{ margin: "4px 0", fontSize: 12 }}>{new Date(s.sighting_date).toLocaleString()}</p>
                {s.clothing_description && <p style={{ fontSize: 11, color: "#666" }}>Wearing: {s.clothing_description}</p>}
                {s.demeanor && <p style={{ fontSize: 11, color: "#666" }}>Demeanor: {s.demeanor}</p>}
                <p style={{ fontSize: 11, color: "#888" }}>Confidence: {s.confidence}</p>
              </div>
            </InfoWindow>
          )}
        </AdvancedMarker>
      ))}

      {/* Evidence markers with video/image thumbnails */}
      {evidence
        .filter((e) => e.latitude && e.longitude)
        .map((e) => (
          <AdvancedMarker
            key={`e-${e.id}`}
            position={{ lat: e.latitude!, lng: e.longitude! }}
            onClick={() => setActiveMarker(activeMarker === `e-${e.id}` ? null : `e-${e.id}`)}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md">
              {e.evidence_type === "video" ? "🎥" : e.evidence_type === "photo" ? "📷" : "📎"}
            </div>
            {activeMarker === `e-${e.id}` && (
              <InfoWindow position={{ lat: e.latitude!, lng: e.longitude! }} onCloseClick={() => setActiveMarker(null)}>
                <div style={{ color: "#000", maxWidth: 280, fontSize: 13 }}>
                  {/* Video/image thumbnail */}
                  {e.file_url && e.mime_type?.startsWith("video") && (
                    <video
                      src={e.file_url}
                      muted
                      preload="metadata"
                      controls
                      style={{ width: "100%", borderRadius: 6, marginBottom: 8 }}
                      onLoadedData={(ev) => { (ev.target as HTMLVideoElement).currentTime = 1; }}
                    />
                  )}
                  {e.file_url && e.mime_type?.startsWith("image") && (
                    <img src={e.file_url} alt={e.title} style={{ width: "100%", borderRadius: 6, marginBottom: 8 }} />
                  )}
                  <strong>{e.title}</strong>
                  {e.capture_date && <p style={{ margin: "4px 0", fontSize: 12 }}>{new Date(e.capture_date).toLocaleString()}</p>}
                  {e.description && <p style={{ fontSize: 11, color: "#666", margin: "4px 0" }}>{e.description}</p>}
                  <p style={{ fontSize: 11, color: "#888" }}>
                    Status: {e.status} · {e.evidence_type}
                  </p>
                </div>
              </InfoWindow>
            )}
          </AdvancedMarker>
        ))}

      {/* Tip markers */}
      {(tips || [])
        .filter((t) => t.latitude && t.longitude)
        .map((t) => (
          <AdvancedMarker
            key={`t-${t.id}`}
            position={{ lat: t.latitude!, lng: t.longitude! }}
            onClick={() => setActiveMarker(activeMarker === `t-${t.id}` ? null : `t-${t.id}`)}
          >
            <Pin background="#eab308" glyphColor="#fff" scale={0.7} />
            {activeMarker === `t-${t.id}` && (
              <InfoWindow position={{ lat: t.latitude!, lng: t.longitude! }} onCloseClick={() => setActiveMarker(null)}>
                <div style={{ color: "#000", maxWidth: 200, fontSize: 13 }}>
                  <strong>{t.title}</strong>
                  <p style={{ margin: "4px 0", fontSize: 12 }}>{t.description}</p>
                  <p style={{ fontSize: 11, color: "#888" }}>Status: {t.status}</p>
                </div>
              </InfoWindow>
            )}
          </AdvancedMarker>
        ))}

      {/* Time circle labels */}
      {showTimeCircles &&
        TIME_CIRCLES.map((tc) => {
          const radiusMeters = (tc.minutes / 60) * 5000;
          const labelLat = LAST_SEEN.lat + radiusMeters / 111320;
          return (
            <AdvancedMarker key={tc.label} position={{ lat: labelLat, lng: LAST_SEEN.lng }} zIndex={5}>
              <div
                className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{ backgroundColor: tc.color + "30", color: tc.color, border: `1px solid ${tc.color}60` }}
              >
                {tc.label}
              </div>
            </AdvancedMarker>
          );
        })}
    </>
  );
}

export default function InvestigationMap({
  sightings,
  timelineEvents,
  evidence = [],
  tips = [],
  showTimeCircles = true,
  showCoverage = false,
}: InvestigationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Google Maps API key not configured</p>
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
        mapTypeId="satellite"
        style={{ width: "100%", height: "100%" }}
      >
        <MapContent
          sightings={sightings}
          evidence={evidence}
          tips={tips}
          showTimeCircles={showTimeCircles}
          showCoverage={showCoverage}
        />
      </Map>
    </APIProvider>
  );
}
