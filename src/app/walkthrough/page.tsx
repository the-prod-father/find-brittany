"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Sighting, TimelineEvent, Evidence } from "@/lib/types";
import CaseChat from "@/components/CaseChat";

const InvestigationMap = dynamic(
  () => import("@/components/InvestigationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    ),
  }
);

const TYPE_COLORS: Record<string, string> = {
  sighting: "#ef4444",
  police_action: "#3b82f6",
  search_effort: "#22c55e",
  media: "#a855f7",
  tip: "#eab308",
  evidence: "#f97316",
  other: "#6b7280",
};

const TYPE_LABELS: Record<string, string> = {
  sighting: "Sighting",
  police_action: "Police",
  search_effort: "Search",
  media: "Media",
  tip: "Tip",
  evidence: "Evidence",
  other: "Event",
};

export default function InvestigationView() {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapQuestion, setMapQuestion] = useState<string | null>(null);
  const [showVideos, setShowVideos] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, sRes, eRes] = await Promise.all([
          fetch("/api/timeline"),
          fetch("/api/sightings"),
          fetch("/api/evidence"),
        ]);
        const [tData, sData, eData] = await Promise.all([
          tRes.json(), sRes.json(), eRes.json(),
        ]);
        setTimelineEvents(tData.events || []);
        setSightings(sData.sightings || []);
        setEvidence(eData.evidence || []);
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEvents = timelineEvents
    .filter((e) => filterType === "all" || e.event_type === filterType)
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

  const latestSighting = sightings
    .filter((s) => s.verified)
    .sort((a, b) => new Date(b.sighting_date).getTime() - new Date(a.sighting_date).getTime())[0];

  const videos = evidence.filter((e) => e.file_url && e.mime_type?.startsWith("video"));

  if (loading) {
    return (
      <div className="h-[calc(100vh-90px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-90px)] sm:h-[calc(100vh-104px)]">
      {/* Left sidebar — Timeline + Videos */}
      <div className="w-full md:w-[380px] md:min-w-[340px] border-b md:border-b-0 md:border-r border-gray-200 flex flex-col max-h-[50vh] md:max-h-none overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Investigation Timeline</h2>
            <span className="text-xs text-gray-400">{filteredEvents.length} events</span>
          </div>

          {/* Last Known */}
          {latestSighting && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Last Known Location</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{latestSighting.location_description}</p>
              <p className="text-xs text-gray-500">
                {new Date(latestSighting.sighting_date).toLocaleString()} — {latestSighting.confidence}
              </p>
            </div>
          )}

          {/* Tabs: Timeline / Videos */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setShowVideos(false)}
              className={`px-3 py-1.5 rounded text-xs font-medium ${!showVideos ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Timeline
            </button>
            <button
              onClick={() => setShowVideos(true)}
              className={`px-3 py-1.5 rounded text-xs font-medium ${showVideos ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              Videos ({videos.length})
            </button>
          </div>

          {/* Filter chips (timeline only) */}
          {!showVideos && (
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2 py-1 rounded-full text-[10px] font-medium ${filterType === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
              >
                All
              </button>
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? "all" : type)}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 ${filterType === type ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!showVideos ? (
            /* Timeline events */
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
              {filteredEvents.map((event) => {
                const color = TYPE_COLORS[event.event_type] || "#6b7280";
                const isSelected = selectedId === event.id;
                return (
                  <div
                    key={event.id}
                    className={`relative pl-10 pr-4 py-3 cursor-pointer border-l-2 transition-colors ${isSelected ? "bg-gray-50 border-l-red-500" : "border-l-transparent hover:bg-gray-50/50"}`}
                    onClick={() => setSelectedId(isSelected ? null : event.id)}
                  >
                    <div
                      className="absolute left-[14px] top-4 w-3 h-3 rounded-full border-2 border-white z-10"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>
                        {TYPE_LABELS[event.event_type] || event.event_type}
                      </span>
                      {event.is_pinned && <span className="text-[9px] font-bold text-red-600">KEY</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 leading-tight">{event.title}</h3>
                    {isSelected && event.description && (
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{event.description}</p>
                    )}
                    <div className="flex gap-3 text-[10px] text-gray-400 mt-1">
                      <span>{new Date(event.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span>{new Date(event.event_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                      {event.location_description && <span className="truncate">{event.location_description}</span>}
                    </div>
                    {isSelected && event.source && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        Source: {event.source_url ? (
                          <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{event.source}</a>
                        ) : event.source}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Video evidence list */
            <div className="p-3 space-y-3">
              {videos.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No video evidence yet</p>
              ) : (
                videos
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((v) => (
                    <div key={v.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <video
                        src={v.file_url!}
                        controls
                        preload="metadata"
                        className="w-full"
                        onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
                      />
                      <div className="p-2.5">
                        <div className="text-xs font-medium text-gray-900">{v.title}</div>
                        {v.location_description && (
                          <div className="text-[10px] text-gray-500 mt-0.5">📍 {v.location_description}</div>
                        )}
                        {v.capture_date && (
                          <div className="text-[10px] text-gray-500">🕐 {new Date(v.capture_date).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-3 border-t border-gray-100 bg-white">
          <a
            href="/submit"
            className="block w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm text-center transition-colors"
          >
            Upload Evidence
          </a>
        </div>
      </div>

      {/* Right — Map */}
      <div className="flex-1 md:h-auto h-[50vh] relative">
        <InvestigationMap
          sightings={sightings}
          timelineEvents={timelineEvents}
          evidence={evidence}
          showTimeCircles={true}
          onAreaClick={(lat, lng) => {
            setMapQuestion(`I clicked on coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)} on the map. What's in this area? Any evidence, sightings, or points of interest nearby? What should someone look for here?`);
          }}
        />

        {/* Bottom-right: AI Chat */}
        <CaseChat
          className="absolute bottom-4 right-4 z-10"
          pendingQuestion={mapQuestion}
          onQuestionHandled={() => setMapQuestion(null)}
        />
      </div>
    </div>
  );
}
