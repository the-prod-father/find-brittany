"use client";

import { useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";

interface Step {
  id: string;
  index: number;
  lat: number;
  lng: number;
  title: string;
  timeLabel: string;
  type: string;
  color: string;
  sameLocationAsPrev: boolean;
}

interface CanvassZone {
  id: string;
  lat: number;
  lng: number;
  label: string;
  reason: string;
  radius: number;
}

interface WalkthroughMapProps {
  steps: Step[];
  currentStep: number;
  showCanvass: boolean;
  canvassZones: CanvassZone[];
}

function MapContent({
  steps,
  currentStep,
  showCanvass,
  canvassZones,
}: WalkthroughMapProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const canvassCirclesRef = useRef<google.maps.Circle[]>([]);
  const prevStep = useRef(-1);

  // Pan to current step
  useEffect(() => {
    if (!map || steps.length === 0) return;
    const step = steps[currentStep];
    if (!step) return;

    // Skip pan if same location as previous step
    if (!step.sameLocationAsPrev || prevStep.current === -1) {
      map.panTo({ lat: step.lat, lng: step.lng });

      if (step.type === "gap") {
        map.setZoom(15);
      } else {
        map.setZoom(17);
      }
    }

    prevStep.current = currentStep;
  }, [map, steps, currentStep]);

  // Draw the trail polyline — only up to current step
  useEffect(() => {
    if (!map || steps.length === 0) return;

    // Remove old polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // Build path up to current step
    const visibleSteps = steps.slice(0, currentStep + 1).filter(s => s.type !== "gap");
    if (visibleSteps.length < 2) return;

    const path = visibleSteps.map((s) => ({ lat: s.lat, lng: s.lng }));

    polylineRef.current = new google.maps.Polyline({
      map,
      path,
      strokeColor: "#e94560",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      geodesic: true,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            strokeColor: "#ffffff",
            strokeWeight: 1,
            fillColor: "#e94560",
            fillOpacity: 1,
          },
          offset: "100%",
        },
        // Direction arrows along the path
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: "#e94560",
            fillColor: "#e94560",
            fillOpacity: 0.7,
          },
          offset: "25%",
          repeat: "25%",
        },
      ],
    });
  }, [map, steps, currentStep]);

  // Search radius circles for current step
  useEffect(() => {
    if (!map) return;

    // Clear old circles
    circlesRef.current.forEach((c) => c.setMap(null));
    circlesRef.current = [];

    const step = steps[currentStep];
    if (!step || step.type === "gap") return;

    // Show a subtle radius around current position
    const circle = new google.maps.Circle({
      map,
      center: { lat: step.lat, lng: step.lng },
      radius: 200, // 200m visibility radius
      strokeColor: step.color,
      strokeOpacity: 0.3,
      strokeWeight: 1,
      fillColor: step.color,
      fillOpacity: 0.05,
      clickable: false,
    });
    circlesRef.current.push(circle);
  }, [map, steps, currentStep]);

  // Canvass zones
  useEffect(() => {
    if (!map) return;

    // Clear old
    canvassCirclesRef.current.forEach((c) => c.setMap(null));
    canvassCirclesRef.current = [];

    if (!showCanvass) return;

    canvassZones.forEach((zone) => {
      const circle = new google.maps.Circle({
        map,
        center: { lat: zone.lat, lng: zone.lng },
        radius: zone.radius,
        strokeColor: "#f97316",
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: "#f97316",
        fillOpacity: 0.15,
        clickable: false,
      });
      canvassCirclesRef.current.push(circle);
    });
  }, [map, showCanvass, canvassZones]);

  // Cleanup
  useEffect(() => {
    return () => {
      polylineRef.current?.setMap(null);
      circlesRef.current.forEach((c) => c.setMap(null));
      canvassCirclesRef.current.forEach((c) => c.setMap(null));
    };
  }, []);

  return (
    <>
      {/* Step markers */}
      {steps
        .filter((s) => s.type !== "gap")
        .map((step, _) => {
          const isCurrent = step.index === currentStep;
          const isPast = step.index < currentStep;
          const isFuture = step.index > currentStep;

          return (
            <AdvancedMarker
              key={step.id}
              position={{ lat: step.lat, lng: step.lng }}
              zIndex={isCurrent ? 100 : isPast ? 50 : 10}
            >
              {isCurrent ? (
                // Current step — large pulsing marker with step number
                <div className="relative">
                  <div
                    className="absolute -inset-4 rounded-full animate-ping"
                    style={{ backgroundColor: step.color, opacity: 0.3 }}
                  />
                  <div
                    className="relative w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm border-3 border-white shadow-lg"
                    style={{ backgroundColor: step.color }}
                  >
                    {step.index + 1}
                  </div>
                </div>
              ) : isPast ? (
                // Past step — solid with number
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white/50"
                  style={{ backgroundColor: step.color, opacity: 0.7 }}
                >
                  {step.index + 1}
                </div>
              ) : (
                // Future step — dimmed
                <div
                  className="w-5 h-5 rounded-full border-2"
                  style={{
                    borderColor: step.color,
                    backgroundColor: step.color + "30",
                    opacity: 0.4,
                  }}
                />
              )}
            </AdvancedMarker>
          );
        })}

      {/* Canvass zone markers */}
      {showCanvass &&
        canvassZones.map((zone) => (
          <AdvancedMarker
            key={zone.id}
            position={{ lat: zone.lat, lng: zone.lng }}
            zIndex={5}
          >
            <div className="bg-orange-600/80 text-white text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap border border-orange-400">
              📷 {zone.label}
            </div>
          </AdvancedMarker>
        ))}
    </>
  );
}

export default function WalkthroughMap(props: WalkthroughMapProps) {
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
        defaultZoom={16}
        mapId="walkthrough-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        streetViewControl={true}
        fullscreenControl={true}
        zoomControl={true}
        mapTypeControl={true}
        style={{ width: "100%", height: "100%" }}
        colorScheme="DARK"
      >
        <MapContent {...props} />
      </Map>
    </APIProvider>
  );
}
