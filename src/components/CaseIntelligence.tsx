"use client";

import { useMemo } from "react";
import type { Sighting, TimelineEvent, Evidence } from "@/lib/types";

interface CaseIntelligenceProps {
  timelineEvents: TimelineEvent[];
  sightings: Sighting[];
  evidence: Evidence[];
}

interface DataPoint {
  id: string;
  date: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  source_type: "news" | "evidence" | "witness" | "police" | "search";
  source_label: string;
  title: string;
  confidence: "confirmed" | "reported" | "unverified";
  has_media: boolean;
  has_location: boolean;
  has_timestamp: boolean;
  quality_score: number; // 0-100
}

function scoreEvidence(e: Evidence): number {
  let score = 10; // base score for any evidence
  if (e.file_url) score += 30; // has media file
  if (e.latitude && e.longitude) score += 25; // has GPS
  if (e.capture_date) score += 20; // has timestamp
  if (e.mime_type?.startsWith("video")) score += 10; // video > photo
  else if (e.mime_type?.startsWith("image")) score += 5;
  if (e.location_description) score += 5;
  return Math.min(score, 100);
}

function qualityLabel(score: number): { label: string; color: string; badge: string } {
  if (score >= 80) return { label: "Gold", color: "#eab308", badge: "GOLD" };
  if (score >= 50) return { label: "Silver", color: "#94a3b8", badge: "SILVER" };
  if (score >= 25) return { label: "Bronze", color: "#cd7c32", badge: "BRONZE" };
  return { label: "Unverified", color: "#6b7280", badge: "NEEDS DATA" };
}

export default function CaseIntelligence({
  timelineEvents,
  sightings,
  evidence,
}: CaseIntelligenceProps) {
  const analysis = useMemo(() => {
    // Build unified data points
    const dataPoints: DataPoint[] = [];

    // From timeline events
    timelineEvents.forEach((e) => {
      const sourceType =
        e.event_type === "media"
          ? "news"
          : e.event_type === "police_action"
            ? "police"
            : e.event_type === "search_effort"
              ? "search"
              : e.event_type === "sighting"
                ? "witness"
                : "witness";

      dataPoints.push({
        id: e.id,
        date: e.event_date,
        location: e.location_description,
        lat: e.latitude,
        lng: e.longitude,
        source_type: sourceType as DataPoint["source_type"],
        source_label: e.source || "Unknown",
        title: e.title,
        confidence: e.is_pinned ? "confirmed" : "reported",
        has_media: !!e.source_url,
        has_location: !!(e.latitude && e.longitude),
        has_timestamp: true,
        quality_score: e.is_pinned ? 70 : 40,
      });
    });

    // Scored evidence
    const scoredEvidence = evidence.map((e) => ({
      evidence: e,
      score: scoreEvidence(e),
      quality: qualityLabel(scoreEvidence(e)),
    }));

    // Stats
    const newsCount = timelineEvents.filter(
      (e) => e.event_type === "media"
    ).length;
    const confirmedSightings = sightings.filter((s) => s.verified).length;
    const totalEvidence = evidence.length;
    const goldEvidence = scoredEvidence.filter((e) => e.score >= 80).length;

    // Location clusters — group events by proximity
    const locationsWithCoords = dataPoints.filter((d) => d.lat && d.lng);

    // Find discrepancies: news reports vs confirmed evidence
    const newsReports = dataPoints.filter((d) => d.source_type === "news");
    const confirmedData = dataPoints.filter(
      (d) => d.confidence === "confirmed"
    );

    // Last known position
    const lastKnown = sightings
      .filter((s) => s.verified)
      .sort(
        (a, b) =>
          new Date(b.sighting_date).getTime() -
          new Date(a.sighting_date).getTime()
      )[0];

    return {
      dataPoints,
      scoredEvidence,
      newsCount,
      confirmedSightings,
      totalEvidence,
      goldEvidence,
      newsReports,
      confirmedData,
      lastKnown,
      locationsWithCoords,
    };
  }, [timelineEvents, sightings, evidence]);

  return (
    <div className="space-y-6">
      {/* Intelligence Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-4">
          <div className="text-xs text-[#8888a0] mb-1">News Reports</div>
          <div className="text-2xl font-bold text-purple-400">
            {analysis.newsCount}
          </div>
        </div>
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-4">
          <div className="text-xs text-[#8888a0] mb-1">
            Confirmed Sightings
          </div>
          <div className="text-2xl font-bold text-red-400">
            {analysis.confirmedSightings}
          </div>
        </div>
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-4">
          <div className="text-xs text-[#8888a0] mb-1">Evidence Files</div>
          <div className="text-2xl font-bold text-blue-400">
            {analysis.totalEvidence}
          </div>
        </div>
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-4">
          <div className="text-xs text-[#8888a0] mb-1">Gold Evidence</div>
          <div className="text-2xl font-bold text-yellow-400">
            {analysis.goldEvidence}
          </div>
          <div className="text-[10px] text-[#8888a0]">
            video + location + time
          </div>
        </div>
      </div>

      {/* Data Source Comparison */}
      <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-5">
        <h3 className="text-sm font-bold mb-4 text-[#f0f0f5]">
          Data Sources — News vs. Confirmed Evidence
        </h3>
        <div className="space-y-1 text-xs">
          <div className="grid grid-cols-12 gap-2 text-[#8888a0] font-semibold pb-2 border-b border-[#2a2a40]">
            <div className="col-span-1">Type</div>
            <div className="col-span-4">Detail</div>
            <div className="col-span-3">Source</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Confidence</div>
          </div>
          {analysis.dataPoints
            .sort(
              (a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            .map((dp) => {
              const typeColors: Record<string, string> = {
                news: "#a855f7",
                evidence: "#3b82f6",
                witness: "#ef4444",
                police: "#3b82f6",
                search: "#22c55e",
              };
              const confColors: Record<string, string> = {
                confirmed: "#22c55e",
                reported: "#eab308",
                unverified: "#6b7280",
              };

              return (
                <div
                  key={dp.id}
                  className="grid grid-cols-12 gap-2 py-1.5 border-b border-[#2a2a40]/50 items-center"
                >
                  <div className="col-span-1">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{
                        backgroundColor: typeColors[dp.source_type] + "20",
                        color: typeColors[dp.source_type],
                      }}
                    >
                      {dp.source_type}
                    </span>
                  </div>
                  <div className="col-span-4 text-[#d0d0dc] truncate">
                    {dp.title}
                  </div>
                  <div className="col-span-3 text-[#8888a0] truncate">
                    {dp.source_label}
                  </div>
                  <div className="col-span-2">
                    {dp.has_location ? (
                      <span className="text-green-400">GPS</span>
                    ) : dp.location ? (
                      <span className="text-yellow-400">Desc</span>
                    ) : (
                      <span className="text-[#555570]">None</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{
                        backgroundColor: confColors[dp.confidence] + "20",
                        color: confColors[dp.confidence],
                      }}
                    >
                      {dp.confidence}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Evidence Quality Scoreboard */}
      {analysis.scoredEvidence.length > 0 && (
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-5">
          <h3 className="text-sm font-bold mb-3 text-[#f0f0f5]">
            Evidence Quality Scoreboard
          </h3>
          <p className="text-[11px] text-[#8888a0] mb-4">
            Video/images with GPS + timestamp = GOLD. The more metadata, the
            higher the investigative value.
          </p>
          <div className="space-y-2">
            {analysis.scoredEvidence
              .sort((a, b) => b.score - a.score)
              .map(({ evidence: e, score, quality }) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-3 bg-[#0f0f1a] rounded-lg"
                >
                  <div
                    className="w-12 h-12 rounded flex items-center justify-center text-[10px] font-black"
                    style={{
                      backgroundColor: quality.color + "20",
                      color: quality.color,
                      border: `1px solid ${quality.color}40`,
                    }}
                  >
                    {quality.badge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {e.title}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#8888a0] mt-0.5">
                      <span>{e.evidence_type}</span>
                      {e.capture_date && (
                        <span className="text-green-400">
                          {new Date(e.capture_date).toLocaleDateString()}
                        </span>
                      )}
                      {e.latitude && e.longitude && (
                        <span className="text-green-400">
                          GPS: {e.latitude.toFixed(4)},{e.longitude.toFixed(4)}
                        </span>
                      )}
                      {!e.latitude && (
                        <span className="text-red-400">No GPS</span>
                      )}
                      {!e.capture_date && (
                        <span className="text-red-400">No timestamp</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold" style={{ color: quality.color }}>
                      {score}
                    </div>
                    <div className="text-[9px] text-[#8888a0]">/ 100</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Key Insight: What we know vs what news says */}
      <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-5">
        <h3 className="text-sm font-bold mb-3 text-[#f0f0f5]">
          Key Discrepancies & Insights
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="w-1 rounded bg-red-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-400">
                Last Confirmed Position
              </div>
              <p className="text-[#a0a0b0] text-xs mt-0.5">
                {analysis.lastKnown ? (
                  <>
                    {analysis.lastKnown.location_description} —{" "}
                    {new Date(
                      analysis.lastKnown.sighting_date
                    ).toLocaleString()}{" "}
                    — Confidence: {analysis.lastKnown.confidence}
                  </>
                ) : (
                  "No confirmed sightings yet"
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1 rounded bg-purple-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-purple-400">
                News Reports Say
              </div>
              <p className="text-[#a0a0b0] text-xs mt-0.5">
                {analysis.newsReports.length} articles. All reference McCouns
                Lane as last seen. Search focused on East Norwich-Oyster Bay
                border. Husband states they have been combing wooded, rural,
                and suburban areas.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-1 rounded bg-yellow-500 flex-shrink-0" />
            <div>
              <div className="font-semibold text-yellow-400">
                Gaps to Fill
              </div>
              <p className="text-[#a0a0b0] text-xs mt-0.5">
                No confirmed sightings after 8:14 PM on March 20. Ring camera
                footage and LIRR station cameras are critical. Any evidence
                with GPS coordinates and timestamps between 8:14 PM - midnight
                is highest priority.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
