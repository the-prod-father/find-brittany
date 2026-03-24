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

export default function PublicMapView() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapQuestion, setMapQuestion] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="h-[calc(100vh-90px)] bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-90px)] sm:h-[calc(100vh-104px)] relative">
      {/* Full-screen map — public data only */}
      <InvestigationMap
        sightings={sightings}
        timelineEvents={timelineEvents}
        evidence={evidence}
        showTimeCircles={true}
        onAreaClick={(lat, lng) => {
          setMapQuestion(`I clicked on coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)} on the map. What's in this area? Are there any evidence, sightings, or points of interest nearby? What should someone in this area look for?`);
        }}
      />

      {/* Top-left: Simple legend */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-lg p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full" /> Last Seen
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded" /> Evidence
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Transit
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-700 pt-1 border-t border-gray-100">
            <div className="w-2.5 h-2.5 rounded-full border border-red-400" /> Walking radius
          </div>
          <div className="pt-1 border-t border-gray-100">
            <div className="text-[10px] text-gray-500">Click map to ask AI</div>
          </div>
        </div>
      </div>

      {/* Bottom-left: Upload CTA */}
      <div className="absolute bottom-4 left-4 z-10">
        <a
          href="/submit"
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          📎 Upload Evidence
        </a>
      </div>

      {/* Bottom-right: AI Chat */}
      <CaseChat
        className="absolute bottom-4 right-4 z-10"
        pendingQuestion={mapQuestion}
        onQuestionHandled={() => setMapQuestion(null)}
      />
    </div>
  );
}
