"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Sighting, TimelineEvent } from "@/lib/types";

const WalkthroughMap = dynamic(
  () => import("@/components/WalkthroughMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0a0a14] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    ),
  }
);

interface WalkthroughStep {
  id: string;
  index: number;
  lat: number;
  lng: number;
  title: string;
  description: string;
  time: string;
  timeLabel: string;
  type: "sighting" | "event" | "gap";
  source?: string;
  sourceUrl?: string;
  clothing?: string;
  demeanor?: string;
  confidence?: string;
  isPinned?: boolean;
  color: string;
  sameLocationAsPrev: boolean;
}

// Known areas likely to have Ring/security cameras along her path
const CANVASS_ZONES = [
  {
    id: "mccouns-north",
    lat: 40.8735,
    lng: -73.5345,
    label: "McCouns Lane (north end)",
    reason: "Direct path from last sighting",
    radius: 100,
  },
  {
    id: "mccouns-south",
    lat: 40.8718,
    lng: -73.5335,
    label: "McCouns Lane (south end)",
    reason: "Likely route toward town",
    radius: 100,
  },
  {
    id: "route-to-lirr",
    lat: 40.869,
    lng: -73.5332,
    label: "Route to LIRR Station",
    reason: "If she headed to the train, she passed through here",
    radius: 150,
  },
  {
    id: "lirr-area",
    lat: 40.866,
    lng: -73.533,
    label: "Oyster Bay LIRR Station area",
    reason: "Station cameras + nearby businesses",
    radius: 120,
  },
  {
    id: "south-street",
    lat: 40.8695,
    lng: -73.5315,
    label: "South Street corridor",
    reason: "Main road connecting last seen to downtown",
    radius: 100,
  },
  {
    id: "east-main",
    lat: 40.8685,
    lng: -73.5305,
    label: "East Main Street businesses",
    reason: "Commercial area with likely security cameras",
    radius: 100,
  },
];

export default function WalkthroughPage() {
  const [steps, setSteps] = useState<WalkthroughStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCanvass, setShowCanvass] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [timelineRes, sightingsRes] = await Promise.all([
          fetch("/api/timeline"),
          fetch("/api/sightings"),
        ]);
        const { events } = await timelineRes.json();
        const { sightings } = await sightingsRes.json();

        // Build steps from timeline events with locations
        const allSteps: WalkthroughStep[] = [];

        // Add timeline events that have coordinates
        (events || [])
          .filter((e: TimelineEvent) => e.latitude && e.longitude)
          .forEach((e: TimelineEvent, idx: number) => {
            const typeColors: Record<string, string> = {
              sighting: "#ef4444",
              police_action: "#3b82f6",
              search_effort: "#22c55e",
              media: "#a855f7",
              tip: "#eab308",
              other: "#6b7280",
            };

            allSteps.push({
              id: e.id,
              index: idx,
              lat: e.latitude!,
              lng: e.longitude!,
              title: e.title,
              description: e.description || "",
              time: e.event_date,
              timeLabel: new Date(e.event_date).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              type: e.event_type === "sighting" ? "sighting" : "event",
              source: e.source || undefined,
              sourceUrl: e.source_url || undefined,
              isPinned: e.is_pinned,
              color: typeColors[e.event_type] || "#6b7280",
              sameLocationAsPrev: false,
            });
          });

        // Add sighting details
        (sightings || []).forEach((s: Sighting) => {
          // Check if already in timeline
          const exists = allSteps.find(
            (step) =>
              Math.abs(step.lat - s.latitude) < 0.0001 &&
              Math.abs(step.lng - s.longitude) < 0.0001
          );
          if (exists) {
            exists.clothing = s.clothing_description || undefined;
            exists.demeanor = s.demeanor || undefined;
            exists.confidence = s.confidence;
          }
        });

        // Sort by time
        allSteps.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );

        // Re-index and mark same-location steps
        allSteps.forEach((s, i) => {
          s.index = i;
          if (i > 0) {
            const prev = allSteps[i - 1];
            s.sameLocationAsPrev =
              Math.abs(s.lat - prev.lat) < 0.001 &&
              Math.abs(s.lng - prev.lng) < 0.001;
          } else {
            s.sameLocationAsPrev = false;
          }
        });

        // Add evidence gap step at the end
        if (allSteps.length > 0) {
          const last = allSteps[allSteps.length - 1];
          allSteps.push({
            id: "evidence-gap",
            index: allSteps.length,
            lat: last.lat,
            lng: last.lng,
            title: "Evidence Trail Goes Cold",
            description:
              "This is the last confirmed data point. Beyond here, we need more footage. Ring cameras, business security cameras, dashcams — anything from this area and time window could extend the trail.",
            time: last.time,
            timeLabel: "After " + last.timeLabel,
            type: "gap",
            color: "#f97316",
            sameLocationAsPrev: true,
          });
        }

        setSteps(allSteps);
      } catch (err) {
        console.error("Failed to load walkthrough data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentStep((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        setIsPlaying(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [steps.length]);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  const goTo = useCallback((idx: number) => {
    setCurrentStep(idx);
    setIsPlaying(false);
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-104px)] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading investigation walkthrough...</p>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];
  const isLastReal = step?.type === "gap";
  const progress = steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] sm:h-[calc(100vh-104px)] bg-white">
      {/* Top bar — progress + controls */}
      <div className="border-b border-gray-200 bg-gray-50 px-2 sm:px-4 py-2 flex items-center gap-2 sm:gap-4">
        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step counter */}
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {currentStep + 1} / {steps.length}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(0)}
            disabled={currentStep === 0}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm"
            title="Start"
          >
            ⏮
          </button>
          <button
            onClick={() => goTo(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm"
            title="Previous (←)"
          >
            ◀
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 px-3 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors text-sm font-semibold"
            title="Auto-play"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={() => goTo(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm"
            title="Next (→)"
          >
            ▶
          </button>
          <button
            onClick={() => goTo(steps.length - 1)}
            disabled={currentStep === steps.length - 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm"
            title="End"
          >
            ⏭
          </button>
        </div>

        {/* Canvass toggle — hidden on very small screens */}
        <button
          onClick={() => setShowCanvass(!showCanvass)}
          className={`hidden sm:block px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            showCanvass
              ? "bg-orange-600/30 text-orange-400 border border-orange-500/30"
              : "bg-white text-gray-500 hover:text-gray-900"
          }`}
        >
          {showCanvass ? "Hide" : "Show"} Canvass
        </button>
      </div>

      {/* Main content — stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col-reverse md:flex-row flex-1 overflow-hidden">
        {/* Detail panel — bottom on mobile, left on desktop */}
        <div className="h-[50%] md:h-auto md:w-[400px] md:min-w-[360px] border-t md:border-t-0 md:border-r border-gray-200 flex flex-col">
          {step && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Step number + type */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black border-2"
                  style={{ backgroundColor: step.color + "20", borderColor: step.color, color: step.color }}
                >
                  {step.index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: step.color }}
                    >
                      {step.type === "gap" ? "Evidence Gap" : step.type === "sighting" ? "Sighting" : "Event"}
                    </span>
                    {step.isPinned && (
                      <span className="text-[10px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                        KEY
                      </span>
                    )}
                    {step.sameLocationAsPrev && step.type !== "gap" && (
                      <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                        Same Location
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">{step.confidence || ""}</div>
                </div>
              </div>

              {/* Time — BIG */}
              <div className="text-3xl font-black mb-2 tracking-tight">{step.timeLabel}</div>

              {/* Title — BIG */}
              <h2 className="text-2xl font-bold mb-4 leading-tight">
                {step.title}
              </h2>

              {/* Description — readable */}
              <p className="text-gray-600 text-base leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Key details — prominent cards */}
              <div className="space-y-3">
                {step.clothing && (
                  <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Last Wearing</div>
                    <div className="text-base font-medium">{step.clothing}</div>
                  </div>
                )}
                {step.demeanor && (
                  <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">State / Demeanor</div>
                    <div className="text-base font-medium text-orange-400">{step.demeanor}</div>
                  </div>
                )}
                {step.source && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Source</div>
                    <div className="text-sm">
                      {step.sourceUrl ? (
                        <a href={step.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                          {step.source} ↗
                        </a>
                      ) : (
                        step.source
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Location footer */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs font-mono text-gray-400">
                  {step.lat.toFixed(5)}, {step.lng.toFixed(5)}
                </div>
                <div className="flex gap-3">
                  <a
                    href={`https://www.google.com/maps/@${step.lat},${step.lng},18z`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Maps ↗
                  </a>
                  <a
                    href={`https://www.google.com/maps/@${step.lat},${step.lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0x0:0x0!2e0!7i16384!8i8192`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Street View ↗
                  </a>
                </div>
              </div>

              {/* Gap analysis */}
              {isLastReal && (
                <div className="mt-6 bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-orange-400 mb-3">
                    Where to Look for More Footage
                  </h3>
                  <div className="space-y-2">
                    {CANVASS_ZONES.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-start gap-2 text-xs cursor-pointer hover:bg-orange-900/10 rounded p-1.5 -mx-1.5 transition-colors"
                        onClick={() => setShowCanvass(true)}
                      >
                        <div className="w-2 h-2 bg-orange-400 rounded-full mt-1 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-gray-700">{zone.label}</div>
                          <div className="text-gray-500">{zone.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <a
                    href="/submit"
                    className="block mt-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-center text-sm font-semibold transition-colors"
                  >
                    Have footage from this area? Submit it
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Step timeline mini */}
          <div className="border-t border-gray-200 p-2 sm:p-3 bg-gray-50">
            <div className="flex gap-1 overflow-x-auto">
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${
                    i === currentStep
                      ? "ring-2 ring-gray-900 scale-110"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: s.color + "30", color: s.color }}
                  title={s.title}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map — top on mobile, right on desktop */}
        <div className="h-[50%] md:h-auto md:flex-1">
          <WalkthroughMap
            steps={steps}
            currentStep={currentStep}
            showCanvass={showCanvass}
            canvassZones={CANVASS_ZONES}
          />
        </div>
      </div>
    </div>
  );
}
