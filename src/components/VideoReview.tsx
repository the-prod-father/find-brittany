"use client";

import { useState, useRef, useEffect } from "react";
import type { Evidence } from "@/lib/types";

type Tab = "info" | "ai" | "transcript";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

function parseTranscript(notes: string | null): TranscriptSegment[] {
  if (!notes || !notes.includes("AUDIO TRANSCRIPTION")) return [];
  const section = notes.split("--- AUDIO TRANSCRIPTION ---")[1] || "";
  const timestamped = section.split("Timestamped:")[1] || "";
  const segments: TranscriptSegment[] = [];

  const lines = timestamped.trim().split("\n");
  for (const line of lines) {
    const match = line.match(/\[(\d+):(\d+)\s*-\s*(\d+):(\d+)\]\s*(.*)/);
    if (match) {
      segments.push({
        start: parseInt(match[1]) * 60 + parseInt(match[2]),
        end: parseInt(match[3]) * 60 + parseInt(match[4]),
        text: match[5].trim(),
      });
    }
  }
  return segments;
}

function parseFrameAnalysis(notes: string | null): Array<{ time: string; description: string }> {
  if (!notes) return [];
  const frames: Array<{ time: string; description: string }> = [];
  // Match [0:05] description pattern
  const regex = /\[(\d+:\d+)\]\s*([^\[]*?)(?=\[\d+:\d+\]|--- AUDIO|$)/g;
  const matches = notes.matchAll(regex);
  for (const m of matches) {
    frames.push({ time: m[1], description: m[2].trim() });
  }
  return frames;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoReview({ evidence: ev }: { evidence: Evidence }) {
  const [tab, setTab] = useState<Tab>("info");
  const [analyzing, setAnalyzing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [localNotes, setLocalNotes] = useState(ev.reviewer_notes);
  const videoRef = useRef<HTMLVideoElement>(null);

  const transcript = parseTranscript(localNotes);
  const frames = parseFrameAnalysis(localNotes);
  const hasTranscript = transcript.length > 0 || localNotes?.includes("AUDIO TRANSCRIPTION");
  const hasAI = frames.length > 0;
  const fullTranscriptText = localNotes?.split("--- AUDIO TRANSCRIPTION ---")[1]?.split("Timestamped:")[0]?.trim();

  // Auto-run transcription and analysis on mount if not done yet
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current) return;
    autoRanRef.current = true;

    if (!hasTranscript && ev.file_url && ev.mime_type?.startsWith("video")) {
      runTranscription();
    }
    if (!hasAI && ev.file_url && ev.mime_type?.startsWith("video")) {
      runAnalysis();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function seekTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }

  async function runAnalysis() {
    if (!ev.file_url) return;
    setAnalyzing(true);
    try {
      // Extract frames client-side
      const res = await fetch(ev.file_url);
      const blob = await res.blob();

      const frames = await new Promise<Array<{ base64: string; timestamp_seconds: number }>>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.crossOrigin = "anonymous";
        video.onloadedmetadata = async () => {
          const duration = video.duration;
          const result: Array<{ base64: string; timestamp_seconds: number }> = [];
          const timestamps = Array.from({ length: 5 }, (_, i) => Math.max(0.5, (duration * (i + 0.5)) / 5));

          for (const ts of timestamps) {
            video.currentTime = ts;
            await new Promise<void>((r) => { video.onseeked = () => r(); });
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(video.videoWidth, 1280);
            canvas.height = Math.min(video.videoHeight, 720);
            canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
            result.push({ base64: canvas.toDataURL("image/jpeg", 0.8).split(",")[1], timestamp_seconds: ts });
          }
          URL.revokeObjectURL(video.src);
          resolve(result);
        };
        video.onerror = () => reject();
        video.src = URL.createObjectURL(blob);
      });

      const analyzeRes = await fetch("/api/analyze-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence_id: ev.id, frames }),
      });

      if (analyzeRes.ok) {
        // Refetch notes
        const evRes = await fetch(`/api/evidence`);
        const evData = await evRes.json();
        const updated = (evData.evidence || []).find((e: Evidence) => e.id === ev.id);
        if (updated) setLocalNotes(updated.reviewer_notes);
        setTab("ai");
      }
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  }

  async function runTranscription() {
    if (!ev.file_url) return;
    setTranscribing(true);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidence_id: ev.id, file_url: ev.file_url }),
      });

      if (res.ok) {
        const evRes = await fetch(`/api/evidence`);
        const evData = await evRes.json();
        const updated = (evData.evidence || []).find((e: Evidence) => e.id === ev.id);
        if (updated) setLocalNotes(updated.reviewer_notes);
        setTab("transcript");
      }
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setTranscribing(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Video player */}
      <video
        ref={videoRef}
        src={ev.file_url!}
        controls
        preload="metadata"
        className="w-full"
        onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setTab("info")}
          className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${tab === "info" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"}`}
        >
          Info
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${tab === "ai" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"}`}
        >
          AI Analysis {hasAI && "✓"}
        </button>
        <button
          onClick={() => setTab("transcript")}
          className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${tab === "transcript" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"}`}
        >
          Transcript {hasTranscript && "✓"}
        </button>
      </div>

      {/* Tab content */}
      <div className="p-3">
        {tab === "info" && (
          <div className="space-y-2 text-xs">
            <div className="font-medium text-gray-900 text-sm">{ev.title}</div>
            {ev.location_description && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">Location</span>
                <span className="text-gray-700">{ev.location_description}</span>
              </div>
            )}
            {ev.capture_date && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">Captured</span>
                <span className="text-gray-700">{new Date(ev.capture_date).toLocaleString()}</span>
              </div>
            )}
            {ev.latitude && ev.longitude && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">GPS</span>
                <span className="text-gray-700">{ev.latitude.toFixed(5)}, {ev.longitude.toFixed(5)}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-16 flex-shrink-0">File</span>
              <span className="text-gray-700">{ev.original_filename} · {ev.mime_type} · {ev.file_size_bytes ? (ev.file_size_bytes / 1024 / 1024).toFixed(1) + " MB" : ""}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-gray-400 w-16 flex-shrink-0">Status</span>
              <span className="text-gray-700 capitalize">{ev.status.replace("_", " ")}</span>
            </div>
            {ev.submitted_by_name && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">From</span>
                <span className="text-gray-700">{ev.submitted_by_name}</span>
              </div>
            )}
            {ev.description && (
              <div className="pt-2 border-t border-gray-100">
                <div className="text-gray-400 mb-1">Description</div>
                <p className="text-gray-700 leading-relaxed">{ev.description}</p>
              </div>
            )}
          </div>
        )}

        {tab === "ai" && (
          <div>
            {hasAI ? (
              <div className="space-y-3">
                {frames.map((frame, i) => (
                  <div
                    key={i}
                    className="flex gap-2 cursor-pointer hover:bg-gray-50 rounded p-1.5 -mx-1.5 transition-colors"
                    onClick={() => {
                      const parts = frame.time.split(":");
                      seekTo(parseInt(parts[0]) * 60 + parseInt(parts[1]));
                    }}
                  >
                    <span className="font-mono text-[10px] text-blue-600 font-bold whitespace-nowrap mt-0.5 cursor-pointer hover:underline">
                      {frame.time}
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed">{frame.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                {analyzing ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500" />
                    Analyzing 5 frames...
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-3">Analysis will run automatically</p>
                    <button
                      onClick={runAnalysis}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
                    >
                      Retry Analysis
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "transcript" && (
          <div>
            {hasTranscript ? (
              <div className="space-y-1">
                {fullTranscriptText && (
                  <p className="text-xs text-gray-700 leading-relaxed mb-3 pb-3 border-b border-gray-100">
                    {fullTranscriptText}
                  </p>
                )}
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Click a timestamp to jump to that moment
                </div>
                {transcript.map((seg, i) => (
                  <div
                    key={i}
                    className="flex gap-2 cursor-pointer hover:bg-blue-50 rounded px-2 py-1.5 -mx-2 transition-colors group"
                    onClick={() => seekTo(seg.start)}
                  >
                    <span className="font-mono text-[10px] text-blue-600 font-bold whitespace-nowrap mt-0.5 group-hover:underline">
                      {formatTime(seg.start)}
                    </span>
                    <p className="text-xs text-gray-700 leading-relaxed">{seg.text}</p>
                  </div>
                ))}
              </div>
            ) : fullTranscriptText ? (
              <p className="text-xs text-gray-700 leading-relaxed">{fullTranscriptText}</p>
            ) : (
              <div className="text-center py-4">
                {transcribing ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500" />
                    Transcribing audio...
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-3">Transcription will run automatically</p>
                    <button
                      onClick={runTranscription}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
                    >
                      Retry Transcription
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
