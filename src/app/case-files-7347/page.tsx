"use client";

import { useEffect, useState } from "react";
import type { Evidence } from "@/lib/types";

type ViewMode = "grid" | "list" | "timeline";

function qualityScore(e: Evidence): { score: number; label: string; color: string } {
  let score = 10;
  if (e.file_url) score += 30;
  if (e.latitude && e.longitude) score += 25;
  if (e.capture_date) score += 20;
  if (e.mime_type?.startsWith("video")) score += 10;
  else if (e.mime_type?.startsWith("image")) score += 5;
  if (e.location_description) score += 5;
  score = Math.min(score, 100);

  if (score >= 80) return { score, label: "GOLD", color: "#eab308" };
  if (score >= 50) return { score, label: "SILVER", color: "#94a3b8" };
  if (score >= 25) return { score, label: "BRONZE", color: "#cd7c32" };
  return { score, label: "NEEDS DATA", color: "#6b7280" };
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/evidence")
      .then((r) => r.json())
      .then((d) => setEvidence(d.evidence || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selected = evidence.find((e) => e.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    );
  }

  // Review mode
  if (selected) {
    const q = qualityScore(selected);
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Back button */}
          <button
            onClick={() => setSelectedId(null)}
            className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-2"
          >
            ← Back to Evidence
          </button>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left — media viewer */}
            <div>
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                {selected.file_url && selected.mime_type?.startsWith("video") ? (
                  <video
                    src={selected.file_url}
                    controls
                    className="w-full"
                    style={{ maxHeight: "70vh" }}
                  />
                ) : selected.file_url && selected.mime_type?.startsWith("image") ? (
                  <img
                    src={selected.file_url}
                    alt={selected.title}
                    className="w-full object-contain"
                    style={{ maxHeight: "70vh" }}
                  />
                ) : (
                  <div className="aspect-video flex items-center justify-center text-4xl bg-white">
                    {selected.evidence_type === "video" ? "🎥" : selected.evidence_type === "audio" ? "🎵" : "📎"}
                  </div>
                )}
              </div>

              {/* Quality score + download */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="px-3 py-1.5 rounded-lg text-sm font-black"
                    style={{ backgroundColor: q.color + "20", color: q.color, border: `1px solid ${q.color}40` }}
                  >
                    {q.label} — {q.score}/100
                  </div>
                  <div className="text-xs text-gray-500 hidden sm:block">
                    {q.score >= 80
                      ? "High investigative value"
                      : q.score >= 50
                        ? "Good evidence — some metadata present"
                        : "Needs more data"}
                  </div>
                </div>
                {selected.file_url && (
                  <a
                    href={selected.file_url}
                    download={selected.original_filename || selected.title}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>

            {/* Right — details */}
            <div className="space-y-4">
              <div>
                <span
                  className="inline-block px-2 py-1 rounded text-xs font-bold uppercase mb-3"
                  style={{ backgroundColor: q.color + "20", color: q.color }}
                >
                  {selected.evidence_type}
                </span>
                <h1 className="text-2xl font-bold mb-2">{selected.title}</h1>
                {selected.description && (
                  <p className="text-gray-600 leading-relaxed">{selected.description}</p>
                )}
              </div>

              {/* Metadata cards */}
              <div className="space-y-3">
                {selected.capture_date && (
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Captured</div>
                    <div className="text-lg font-semibold">
                      {new Date(selected.capture_date).toLocaleString()}
                    </div>
                  </div>
                )}

                {selected.latitude && selected.longitude && (
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">GPS Location</div>
                    <div className="text-lg font-mono font-semibold">
                      {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                    </div>
                    {selected.location_description && (
                      <div className="text-sm text-gray-600 mt-1">{selected.location_description}</div>
                    )}
                    <div className="flex gap-3 mt-2">
                      <a
                        href={`https://www.google.com/maps/@${selected.latitude},${selected.longitude},18z`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Open Maps ↗
                      </a>
                      <a
                        href={`https://www.google.com/maps/@${selected.latitude},${selected.longitude},3a,75y,90t/data=!3m6!1e1!3m4!1s0x0:0x0!2e0!7i16384!8i8192`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Street View ↗
                      </a>
                    </div>
                  </div>
                )}

                {!selected.latitude && (
                  <div className="bg-red-900/15 border border-red-500/20 rounded-lg p-4">
                    <div className="text-red-400 font-semibold text-sm mb-1">No GPS Data</div>
                    <div className="text-xs text-gray-600">
                      This evidence has no location coordinates. If you know where it was captured,
                      please submit additional details.
                    </div>
                  </div>
                )}

                {selected.submitted_by_name && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Submitted By</div>
                    <div className="text-sm">{selected.submitted_by_name}</div>
                  </div>
                )}

                <div className="bg-white rounded-lg p-4">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">File Details</div>
                  <div className="text-sm space-y-1">
                    {selected.original_filename && <div>Filename: {selected.original_filename}</div>}
                    {selected.mime_type && <div>Type: {selected.mime_type}</div>}
                    {selected.file_size_bytes && (
                      <div>Size: {(selected.file_size_bytes / 1024 / 1024).toFixed(1)} MB</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Status</div>
                  <div className="text-sm capitalize">{selected.status.replace("_", " ")}</div>
                </div>

                {selected.chain_of_custody && selected.chain_of_custody.length > 0 && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Chain of Custody</div>
                    <div className="space-y-1">
                      {selected.chain_of_custody.map((entry, i) => (
                        <div key={i} className="text-xs text-gray-600">
                          {(entry as Record<string, string>).action} — {(entry as Record<string, string>).timestamp} — {(entry as Record<string, string>).by}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Evidence</h1>
            <p className="text-gray-500">
              {evidence.length} items submitted to the investigation
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white rounded-lg p-1">
            {(["grid", "list", "timeline"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors ${
                  view === v
                    ? "bg-red-600/20 text-red-400"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {evidence.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📎</div>
            <h2 className="text-xl font-bold mb-2">No evidence yet</h2>
            <p className="text-gray-500 mb-6">Be the first to submit photos, videos, or other evidence.</p>
            <a href="/submit" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
              Submit Evidence
            </a>
          </div>
        ) : view === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {evidence.map((e) => {
              const q = qualityScore(e);
              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative">
                    {e.file_url && e.mime_type?.startsWith("image") ? (
                      <img src={e.file_url} alt={e.title} className="w-full h-full object-cover" />
                    ) : e.file_url && e.mime_type?.startsWith("video") ? (
                      <>
                        <video
                          src={e.file_url}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover"
                          onLoadedData={(ev) => { (ev.target as HTMLVideoElement).currentTime = 1; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-white ml-1" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-3xl">
                        {e.evidence_type === "audio" ? "🎵" : "📎"}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: q.color + "20", color: q.color }}
                      >
                        {q.label}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">{e.evidence_type}</span>
                    </div>
                    <h3 className="text-sm font-semibold truncate">{e.title}</h3>
                    {e.capture_date && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        {new Date(e.capture_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : view === "list" ? (
          /* List View */
          <div className="space-y-2">
            {evidence.map((e) => {
              const q = qualityScore(e);
              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer transition-colors flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ backgroundColor: q.color + "20", color: q.color }}
                  >
                    {q.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{e.title}</div>
                    <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                      <span className="capitalize">{e.evidence_type}</span>
                      {e.capture_date && <span>{new Date(e.capture_date).toLocaleString()}</span>}
                      {e.latitude && <span className="text-green-400">GPS</span>}
                      {!e.latitude && <span className="text-red-400">No GPS</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 capitalize">{e.status.replace("_", " ")}</div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Timeline View */
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200" />
            {evidence
              .filter((e) => e.capture_date)
              .sort((a, b) => new Date(a.capture_date!).getTime() - new Date(b.capture_date!).getTime())
              .map((e) => {
                const q = qualityScore(e);
                return (
                  <div
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className="relative pl-16 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="absolute left-[18px] top-6 w-4 h-4 rounded-full border-2 border-white"
                      style={{ backgroundColor: q.color }}
                    />
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(e.capture_date!).toLocaleString()}
                    </div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-gray-500 mt-1 flex gap-3">
                      <span className="capitalize">{e.evidence_type}</span>
                      <span style={{ color: q.color }}>{q.label}</span>
                      {e.latitude && <span className="text-green-400">GPS: {e.latitude.toFixed(4)}, {e.longitude?.toFixed(4)}</span>}
                    </div>
                  </div>
                );
              })}
            {evidence.filter((e) => !e.capture_date).length > 0 && (
              <div className="mt-8 pl-16">
                <div className="text-sm font-semibold text-gray-500 mb-3">No Timestamp</div>
                {evidence.filter((e) => !e.capture_date).map((e) => {
                  const q = qualityScore(e);
                  return (
                    <div
                      key={e.id}
                      onClick={() => setSelectedId(e.id)}
                      className="py-2 cursor-pointer hover:text-gray-900 transition-colors"
                    >
                      <div className="font-semibold text-sm">{e.title}</div>
                      <div className="text-xs text-gray-400">
                        {e.evidence_type} · <span style={{ color: q.color }}>{q.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
