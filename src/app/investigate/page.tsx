"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Sighting, TimelineEvent, Evidence } from "@/lib/types";
import CaseIntelligence from "@/components/CaseIntelligence";

const InvestigationMap = dynamic(
  () => import("@/components/InvestigationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0f0f1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    ),
  }
);

const EVENT_TYPE_COLORS: Record<string, string> = {
  sighting: "#ef4444",
  police_action: "#3b82f6",
  search_effort: "#22c55e",
  media: "#a855f7",
  tip: "#eab308",
  evidence: "#f97316",
  other: "#6b7280",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  sighting: "Sighting",
  police_action: "Police",
  search_effort: "Search",
  media: "Media",
  tip: "Tip",
  evidence: "Evidence",
  other: "Event",
};

type PanelView = "timeline" | "intel";

export default function InvestigatePage() {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [panelView, setPanelView] = useState<PanelView>("timeline");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [timelineRes, sightingsRes, evidenceRes] = await Promise.all([
          fetch("/api/timeline"),
          fetch("/api/sightings"),
          fetch("/api/evidence"),
        ]);
        const timelineData = await timelineRes.json();
        const sightingsData = await sightingsRes.json();
        const evidenceData = await evidenceRes.json();

        setTimelineEvents(timelineData.events || []);
        setSightings(sightingsData.sightings || []);
        setEvidence(evidenceData.evidence || []);
      } catch (err) {
        console.error("Failed to load investigation data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEvents = timelineEvents
    .filter((e) => filterType === "all" || e.event_type === filterType)
    .sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );

  // Latest known location
  const latestSighting = sightings
    .filter((s) => s.verified)
    .sort(
      (a, b) =>
        new Date(b.sighting_date).getTime() -
        new Date(a.sighting_date).getTime()
    )[0];

  return (
    <div className="flex h-[calc(100vh-64px-40px)] bg-[#0f0f1a]">
      {/* Left: Timeline Panel */}
      <div className="w-[420px] min-w-[360px] border-r border-[#2a2a40] flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 border-b border-[#2a2a40] bg-[#161625]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Investigation Timeline</h2>
            <span className="text-xs text-[#8888a0]">
              {filteredEvents.length} events
            </span>
          </div>

          {/* Last Known Location */}
          {latestSighting && (
            <div
              className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 mb-3 cursor-pointer hover:border-red-600/60 transition-colors"
              onClick={() => setSelectedEventId(latestSighting.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Last Known Location
                </span>
              </div>
              <p className="text-sm font-semibold">
                {latestSighting.location_description}
              </p>
              <p className="text-xs text-[#8888a0]">
                {new Date(latestSighting.sighting_date).toLocaleString()} —{" "}
                {latestSighting.confidence}
              </p>
            </div>
          )}

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === "all"
                  ? "bg-white/10 text-white"
                  : "text-[#8888a0] hover:text-white"
              }`}
            >
              All
            </button>
            {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                onClick={() =>
                  setFilterType(filterType === type ? "all" : type)
                }
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterType === type
                    ? "bg-white/10 text-white"
                    : "text-[#8888a0] hover:text-white"
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
                />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Events List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center text-[#8888a0] py-12 text-sm">
              No events to display
            </div>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-[#2a2a40]" />

              {filteredEvents.map((event, idx) => {
                const color = EVENT_TYPE_COLORS[event.event_type] || "#6b7280";
                const isSelected = selectedEventId === event.id;
                const isPinned = event.is_pinned;

                return (
                  <div
                    key={event.id}
                    className={`relative pl-12 pr-4 py-3 cursor-pointer transition-colors border-l-2 ${
                      isSelected
                        ? "bg-white/5 border-l-red-500"
                        : "border-l-transparent hover:bg-white/[0.02]"
                    }`}
                    onClick={() => {
                      setSelectedEventId(
                        selectedEventId === event.id ? null : event.id
                      );
                    }}
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute left-[18px] top-5 w-3.5 h-3.5 rounded-full border-2 border-[#0f0f1a] z-10"
                      style={{ backgroundColor: color }}
                    />

                    {/* Event content */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color }}
                          >
                            {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                          </span>
                          {isPinned && (
                            <span className="text-[10px] text-red-400 font-bold">
                              PINNED
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold leading-tight mb-1">
                          {event.title}
                        </h3>
                        {isSelected && event.description && (
                          <p className="text-xs text-[#a0a0b0] leading-relaxed mb-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-[#8888a0]">
                          <span>
                            {new Date(event.event_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                          <span>
                            {new Date(event.event_date).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                          {event.location_description && (
                            <span className="truncate">
                              {event.location_description}
                            </span>
                          )}
                        </div>
                        {isSelected && event.source && (
                          <p className="text-[11px] text-[#666675] mt-1">
                            Source: {event.source}
                          </p>
                        )}
                      </div>

                      {/* Location indicator */}
                      {event.latitude && event.longitude && (
                        <div className="flex-shrink-0 mt-1">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] border"
                            style={{
                              borderColor: color,
                              color: color,
                            }}
                            title="Has location — click to view on map"
                          >
                            &#9679;
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Footer CTA */}
        <div className="p-3 border-t border-[#2a2a40] bg-[#161625]">
          <a
            href="/submit"
            className="block w-full py-2.5 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm text-center transition-colors"
          >
            Submit a Tip
          </a>
        </div>
      </div>

      {/* Right: Google Map */}
      <div className="flex-1 relative">
        <InvestigationMap
          sightings={sightings}
          timelineEvents={timelineEvents}
          selectedEventId={selectedEventId}
        />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 left-4 bg-[#161625]/90 backdrop-blur border border-[#2a2a40] rounded-lg p-3 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
              <span className="text-[#d0d0dc]">Last Seen / Sighting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
              <span className="text-[#d0d0dc]">Poster Address</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
              <span className="text-[#d0d0dc]">Transit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <span className="text-[#d0d0dc]">Search Area / POI</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[#2a2a40]">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-red-500 opacity-50" />
              <span className="text-[#8888a0]">Search radius rings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
