"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Sighting, TimelineEvent, Evidence, Tip } from "@/lib/types";
import CaseChat from "@/components/CaseChat";
import AddressSearch from "@/components/AddressSearch";

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

interface CanvassLocation {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  contacted_by: string | null;
  contacted_at: string | null;
  has_camera: boolean | null;
  footage_obtained: boolean;
  footage_notes: string | null;
  priority: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  not_visited: { label: "Not Visited", color: "#ef4444", bg: "bg-red-50 text-red-700" },
  no_answer: { label: "No Answer", color: "#f97316", bg: "bg-orange-50 text-orange-700" },
  visited: { label: "Visited", color: "#3b82f6", bg: "bg-blue-50 text-blue-700" },
  has_camera: { label: "Has Camera", color: "#eab308", bg: "bg-yellow-50 text-yellow-700" },
  footage_obtained: { label: "Footage Got", color: "#22c55e", bg: "bg-green-50 text-green-700" },
  no_camera: { label: "No Camera", color: "#6b7280", bg: "bg-gray-50 text-gray-600" },
  refused: { label: "Refused", color: "#6b7280", bg: "bg-gray-50 text-gray-500" },
};

export default function CommandCenter() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [canvass, setCanvass] = useState<CanvassLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeCircles, setShowTimeCircles] = useState(true);
  const [showCoverage, setShowCoverage] = useState(false);
  const [showCanvassList, setShowCanvassList] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [mapQuestion, setMapQuestion] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, sRes, eRes, tipRes, cRes] = await Promise.all([
          fetch("/api/timeline"),
          fetch("/api/sightings"),
          fetch("/api/evidence"),
          fetch("/api/tips?all=true"),
          fetch("/api/canvass"),
        ]);
        const [tData, sData, eData, tipData, cData] = await Promise.all([
          tRes.json(), sRes.json(), eRes.json(), tipRes.json(), cRes.json(),
        ]);
        setTimelineEvents(tData.events || []);
        setSightings(sData.sightings || []);
        setEvidence(eData.evidence || []);
        setTips(tipData.tips || []);
        setCanvass(cData.locations || []);
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addCanvassLocation = useCallback(async ({ address, lat, lng }: { address: string; lat: number; lng: number }) => {
    const res = await fetch("/api/canvass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, latitude: lat, longitude: lng }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setCanvass((prev) => [...prev, { id, address, latitude: lat, longitude: lng, status: "not_visited", notes: null, contacted_by: null, contacted_at: null, has_camera: null, footage_obtained: false, footage_notes: null, priority: "medium" }]);
      setAddingAddress(false);
    }
  }, []);

  const updateCanvass = useCallback(async (id: string, updates: Partial<CanvassLocation>) => {
    const res = await fetch("/api/canvass", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      setCanvass((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
      </div>
    );
  }

  const canvassStats = {
    total: canvass.length,
    visited: canvass.filter((c) => c.status !== "not_visited" && c.status !== "no_answer").length,
    footage: canvass.filter((c) => c.footage_obtained).length,
  };

  return (
    <div className="h-[calc(100vh-90px)] sm:h-[calc(100vh-104px)] relative">
      {/* Full-screen map */}
      <InvestigationMap
        sightings={sightings}
        timelineEvents={timelineEvents}
        evidence={evidence}
        tips={tips}
        showTimeCircles={showTimeCircles}
        showCoverage={showCoverage}
        onAreaClick={(lat, lng) => {
          setMapQuestion(`I clicked on coordinates ${lat.toFixed(5)}, ${lng.toFixed(5)} on the investigation map. What's in this area? What buildings, businesses, or homes are here? Are there any cameras, evidence, or sightings nearby? What should we investigate or look for in this specific area? Consider proximity to Brittany's last known path.`);
        }}
      />

      {/* Top-left: Controls */}
      <div className="absolute top-3 left-3 z-10">
        <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg p-3 space-y-2" style={{ maxWidth: 200 }}>
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div className="bg-gray-50 rounded py-1">
              <div className="text-sm font-bold">{evidence.length}</div>
              <div className="text-[9px] text-gray-500">Evidence</div>
            </div>
            <div className="bg-gray-50 rounded py-1">
              <div className="text-sm font-bold">{sightings.length}</div>
              <div className="text-[9px] text-gray-500">Sightings</div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input type="checkbox" checked={showTimeCircles} onChange={(e) => setShowTimeCircles(e.target.checked)} className="rounded" />
              <span className="text-gray-700">Walking radius</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input type="checkbox" checked={showCoverage} onChange={(e) => setShowCoverage(e.target.checked)} className="rounded" />
              <span className="text-gray-700">Camera coverage</span>
            </label>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-1">
            <button
              onClick={() => setShowCanvassList(!showCanvassList)}
              className={`w-full text-left text-[11px] px-2 py-1.5 rounded font-medium ${showCanvassList ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-600"}`}
            >
              Canvass List ({canvassStats.visited}/{canvassStats.total})
            </button>
            <a href="/review/bk-ops-7347" className="block text-[11px] text-blue-600 hover:underline px-2">Review Evidence</a>
            <a href="/walkthrough" className="block text-[11px] text-blue-600 hover:underline px-2">Walkthrough</a>
          </div>
        </div>
      </div>

      {/* Canvass checklist panel */}
      {showCanvassList && (
        <div className="absolute top-3 left-[220px] z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col"
          style={{ width: 340, maxHeight: "calc(100vh - 160px)" }}
        >
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-900">Door-to-Door Canvass</h3>
              <button onClick={() => setShowCanvassList(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <div className="flex gap-2 text-[10px] text-gray-500">
              <span>{canvassStats.total} locations</span>
              <span>·</span>
              <span>{canvassStats.visited} contacted</span>
              <span>·</span>
              <span className="text-green-600 font-medium">{canvassStats.footage} footage</span>
            </div>

            {/* Add location */}
            {addingAddress ? (
              <div className="mt-2">
                <AddressSearch
                  onSelect={(result) => addCanvassLocation(result)}
                  placeholder="Type address to add..."
                />
                <button onClick={() => setAddingAddress(false)} className="text-[10px] text-gray-500 mt-1">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingAddress(true)}
                className="mt-2 w-full py-1.5 border border-dashed border-gray-300 rounded text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
              >
                + Add location
              </button>
            )}
          </div>

          {/* Location list */}
          <div className="flex-1 overflow-y-auto">
            {canvass.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No locations yet. Add addresses to start canvassing.
              </div>
            ) : (
              canvass.map((loc) => {
                const status = STATUS_CONFIG[loc.status] || STATUS_CONFIG.not_visited;
                return (
                  <div key={loc.id} className="border-b border-gray-100 p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-xs font-medium text-gray-900 leading-tight">{loc.address}</div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${status.bg}`}>
                        {status.label}
                      </span>
                    </div>

                    {loc.notes && <div className="text-[10px] text-gray-500 mb-1.5">{loc.notes}</div>}
                    {loc.contacted_by && (
                      <div className="text-[10px] text-gray-400 mb-1.5">
                        By {loc.contacted_by} {loc.contacted_at ? `· ${new Date(loc.contacted_at).toLocaleDateString()}` : ""}
                      </div>
                    )}

                    {/* Quick status buttons */}
                    <div className="flex flex-wrap gap-1">
                      {loc.status === "not_visited" && (
                        <>
                          <button onClick={() => updateCanvass(loc.id, { status: "no_answer" })} className="text-[9px] px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100">No Answer</button>
                          <button onClick={() => updateCanvass(loc.id, { status: "visited" })} className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Visited</button>
                          <button onClick={() => updateCanvass(loc.id, { status: "no_camera" })} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">No Camera</button>
                        </>
                      )}
                      {(loc.status === "visited" || loc.status === "no_answer") && (
                        <>
                          <button onClick={() => updateCanvass(loc.id, { status: "has_camera", has_camera: true })} className="text-[9px] px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100">Has Camera</button>
                          <button onClick={() => updateCanvass(loc.id, { status: "no_camera" })} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">No Camera</button>
                          <button onClick={() => updateCanvass(loc.id, { status: "refused" })} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Refused</button>
                        </>
                      )}
                      {loc.status === "has_camera" && !loc.footage_obtained && (
                        <button onClick={() => updateCanvass(loc.id, { status: "footage_obtained", footage_obtained: true })} className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded hover:bg-green-100 font-medium">Footage Obtained</button>
                      )}
                      {loc.footage_obtained && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">✓ Footage collected</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Bottom-right: AI Chat */}
      <CaseChat
        className="absolute bottom-4 right-4 z-10"
        pendingQuestion={mapQuestion}
        onQuestionHandled={() => setMapQuestion(null)}
      />
    </div>
  );
}
