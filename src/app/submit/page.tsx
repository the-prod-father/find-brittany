"use client";

import { useState, useRef } from "react";
import exifr from "exifr";

type EvidenceType = "photo" | "video" | "document" | "screenshot" | "audio" | "social_media_link" | "other";

interface FileMetadata {
  latitude?: number;
  longitude?: number;
  captureDate?: string;
  make?: string;
  model?: string;
}

interface AIAnalysis {
  timestamp?: string | null;
  date?: string | null;
  time?: string | null;
  camera_name?: string | null;
  location_text?: string | null;
  people_visible?: boolean;
  people_count?: number;
  people_description?: string | null;
  vehicles_visible?: boolean;
  vehicle_description?: string | null;
  environment?: string | null;
  lighting?: string | null;
  weather_visible?: string | null;
  notable_details?: string | null;
}

interface FileUpload {
  file: File;
  type: EvidenceType;
  metadata?: FileMetadata;
  aiAnalysis?: AIAnalysis | null;
  analyzing?: boolean;
  frameUrl?: string;
}

export default function SubmitTipPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [note, setNote] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detected metadata from files
  const [detectedDate, setDetectedDate] = useState("");
  const [detectedTime, setDetectedTime] = useState("");
  const [detectedLat, setDetectedLat] = useState("");
  const [detectedLng, setDetectedLng] = useState("");
  const [detectedLocation, setDetectedLocation] = useState("");

  function getFileType(file: File): EvidenceType {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "heic", "webp"].includes(ext)) return "photo";
    if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
    if (["pdf", "doc", "docx", "txt"].includes(ext)) return "document";
    if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
    return "other";
  }

  async function addFiles(fileList: FileList) {
    const newFiles: FileUpload[] = [];

    for (const file of Array.from(fileList)) {
      const type = getFileType(file);
      let metadata: FileMetadata = {};

      // Extract EXIF metadata
      try {
        const exif = await exifr.parse(file, {
          gps: true,
          pick: ["DateTimeOriginal", "CreateDate", "GPSLatitude", "GPSLongitude", "Make", "Model"],
        });
        if (exif) {
          metadata = {
            latitude: exif.latitude,
            longitude: exif.longitude,
            captureDate: exif.DateTimeOriginal?.toISOString?.() || exif.CreateDate?.toISOString?.() || undefined,
            make: exif.Make,
            model: exif.Model,
          };
          if (metadata.latitude && metadata.longitude && !detectedLat) {
            setDetectedLat(metadata.latitude.toFixed(6));
            setDetectedLng(metadata.longitude!.toFixed(6));
          }
          if (metadata.captureDate && !detectedDate) {
            const d = new Date(metadata.captureDate);
            setDetectedDate(d.toISOString().split("T")[0]);
            setDetectedTime(d.toTimeString().slice(0, 5));
          }
        }
      } catch {
        // No EXIF data
      }

      newFiles.push({ file, type, metadata });
    }

    setFiles((prev) => [...prev, ...newFiles]);

    // Auto-trigger AI analysis for video/image files
    const startIdx = files.length;
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      if (f.type === "video" || f.type === "photo") {
        analyzeWithAI(startIdx + i, [...files, ...newFiles]);
      }
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Extract a frame from a video file
  function extractVideoFrame(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1);
      };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src);
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          0.9
        );
      };
      video.onerror = () => reject(new Error("Video load error"));
      video.src = URL.createObjectURL(file);
    });
  }

  // AI analysis
  async function analyzeWithAI(index: number, currentFiles?: FileUpload[]) {
    const fileList = currentFiles || files;
    const fileUpload = fileList[index];
    if (!fileUpload) return;

    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, analyzing: true } : f))
    );

    try {
      let frameBlob: Blob;
      if (fileUpload.type === "video") {
        frameBlob = await extractVideoFrame(fileUpload.file);
      } else {
        frameBlob = fileUpload.file;
      }

      const frameUrl = URL.createObjectURL(frameBlob);
      const formData = new FormData();
      formData.append("frame", frameBlob, "frame.jpg");

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Analysis failed");
      const { analysis } = await res.json();

      // Auto-fill detected fields
      if (analysis.date && !detectedDate) {
        const dateStr = analysis.date.replace(/\//g, "-");
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const isoDate =
            parts[2].length === 4
              ? `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
              : dateStr;
          setDetectedDate(isoDate);
        }
      }
      if (analysis.time && !detectedTime) {
        const match = analysis.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          let hours = parseInt(match[1]);
          const mins = match[2];
          const ampm = match[3]?.toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          setDetectedTime(`${hours.toString().padStart(2, "0")}:${mins}`);
        }
      }
      if (analysis.location_text && !detectedLocation) {
        setDetectedLocation(analysis.location_text);
      }

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, analyzing: false, aiAnalysis: analysis, frameUrl } : f
        )
      );
    } catch (err) {
      console.error("AI analysis error:", err);
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, analyzing: false } : f))
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 && !note.trim()) return;
    setSubmitting(true);

    try {
      // Create tip
      const tipData = {
        title: files.length > 0
          ? `Evidence submission: ${files.length} file${files.length > 1 ? "s" : ""}`
          : "Tip submission",
        description: note || "Evidence uploaded via web submission",
        submitter_name: contactName || null,
        submitter_phone: contactPhone || null,
        is_anonymous: !contactName && !contactPhone,
        tip_date: detectedDate
          ? `${detectedDate}${detectedTime ? "T" + detectedTime : ""}`
          : null,
        latitude: detectedLat ? parseFloat(detectedLat) : null,
        longitude: detectedLng ? parseFloat(detectedLng) : null,
        location_description: detectedLocation || null,
      };

      const tipRes = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tipData),
      });

      if (!tipRes.ok) throw new Error("Failed to submit");
      const { id: tipId } = await tipRes.json();

      // Upload files
      for (const fileUpload of files) {
        const formData = new FormData();
        formData.append("file", fileUpload.file);
        formData.append("tip_id", tipId);
        formData.append("evidence_type", fileUpload.type);
        formData.append("title", fileUpload.file.name);
        formData.append("description",
          fileUpload.aiAnalysis?.notable_details ||
          fileUpload.aiAnalysis?.people_description ||
          ""
        );
        if (fileUpload.metadata?.captureDate) {
          formData.append("capture_date", fileUpload.metadata.captureDate);
        }
        if (fileUpload.metadata?.latitude) {
          formData.append("latitude", fileUpload.metadata.latitude.toString());
        }
        if (fileUpload.metadata?.longitude) {
          formData.append("longitude", fileUpload.metadata.longitude.toString());
        }
        if (contactName) formData.append("submitted_by_name", contactName);

        await fetch("/api/evidence", { method: "POST", body: formData });
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting. Please try again or call 516-573-7347.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-6">✓</div>
        <h1 className="text-3xl font-bold mb-4">Thank You</h1>
        <p className="text-gray-500 text-lg mb-8">
          Your evidence has been submitted and will be reviewed by the investigation
          team. Every piece of information matters.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => { setSubmitted(false); setFiles([]); setNote(""); setContactName(""); setContactPhone(""); setDetectedDate(""); setDetectedTime(""); setDetectedLat(""); setDetectedLng(""); setDetectedLocation(""); }}
            className="px-6 py-3 bg-white border border-gray-200 rounded-lg hover:bg-[#2a2a40] transition-colors"
          >
            Submit More
          </button>
          <a
            href="/investigate"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
          >
            View Investigation
          </a>
        </div>
      </div>
    );
  }

  const isAnalyzing = files.some((f) => f.analyzing);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Submit Evidence</h1>
        <p className="text-gray-500">
          Drop your photos or videos below. Our AI will automatically extract
          timestamps, locations, and details. No account needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop Zone — The main event */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-12 border-2 border-dashed border-gray-200 rounded-lg hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer"
          >
            <div className="text-center">
              <div className="text-4xl mb-3">📎</div>
              <div className="text-lg font-semibold mb-1">
                Drop files here or tap to upload
              </div>
              <div className="text-sm text-gray-500">
                Ring videos, photos, screenshots — anything that might help
              </div>
              <div className="text-xs text-gray-400 mt-2">
                AI will automatically read timestamps and details from your files
              </div>
            </div>
          </button>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-3">
              {files.map((f, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {f.type === "video" ? "🎥" : f.type === "photo" ? "📷" : "📎"}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[250px]">
                        {f.file.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {(f.file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-red-400 text-xs hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>

                  {/* EXIF data */}
                  {f.metadata && (f.metadata.captureDate || f.metadata.latitude) && (
                    <div className="text-xs text-green-400 mb-2">
                      EXIF: {f.metadata.captureDate && new Date(f.metadata.captureDate).toLocaleString()}
                      {f.metadata.latitude && ` · GPS: ${f.metadata.latitude.toFixed(4)}, ${f.metadata.longitude?.toFixed(4)}`}
                    </div>
                  )}

                  {/* AI analyzing */}
                  {f.analyzing && (
                    <div className="flex items-center gap-2 text-xs text-blue-400">
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400" />
                      AI is reading this file...
                    </div>
                  )}

                  {/* AI results */}
                  {f.aiAnalysis && (
                    <div className="bg-blue-900/15 border border-blue-500/20 rounded p-3 text-xs space-y-1">
                      {f.frameUrl && (
                        <img src={f.frameUrl} alt="Frame" className="w-full rounded mb-2 opacity-80" />
                      )}
                      <div className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider mb-1">AI Extracted</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {f.aiAnalysis.date && <div className="text-gray-600">Date: <span className="text-white">{f.aiAnalysis.date}</span></div>}
                        {f.aiAnalysis.time && <div className="text-gray-600">Time: <span className="text-white">{f.aiAnalysis.time}</span></div>}
                        {f.aiAnalysis.camera_name && <div className="text-gray-600">Camera: <span className="text-white">{f.aiAnalysis.camera_name}</span></div>}
                        {f.aiAnalysis.lighting && <div className="text-gray-600">Lighting: <span className="text-white">{f.aiAnalysis.lighting}</span></div>}
                      </div>
                      {f.aiAnalysis.people_visible && f.aiAnalysis.people_description && (
                        <div className="text-yellow-400 mt-1">People: {f.aiAnalysis.people_description}</div>
                      )}
                      {f.aiAnalysis.environment && (
                        <div className="text-gray-600 mt-1">Scene: {f.aiAnalysis.environment}</div>
                      )}
                      {f.aiAnalysis.notable_details && (
                        <div className="text-red-400 font-medium mt-1">{f.aiAnalysis.notable_details}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-detected info bar */}
        {(detectedDate || detectedLat || detectedLocation) && (
          <div className="bg-green-900/15 border border-green-500/20 rounded-lg p-4 text-sm">
            <div className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">Auto-Detected from your files</div>
            <div className="flex flex-wrap gap-4 text-xs">
              {detectedDate && <div className="text-gray-700">Date: <span className="text-white font-medium">{detectedDate}</span></div>}
              {detectedTime && <div className="text-gray-700">Time: <span className="text-white font-medium">{detectedTime}</span></div>}
              {detectedLat && <div className="text-gray-700">GPS: <span className="text-white font-medium">{detectedLat}, {detectedLng}</span></div>}
              {detectedLocation && <div className="text-gray-700">Location: <span className="text-white font-medium">{detectedLocation}</span></div>}
            </div>
          </div>
        )}

        {/* Optional note */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <label className="block text-sm text-gray-500 mb-2">
            Add a note <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none resize-y text-sm"
            placeholder="Anything you want to tell us about this evidence..."
          />
        </div>

        {/* Contact info — minimal */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <label className="block text-sm text-gray-500 mb-3">
            Contact info <span className="text-gray-400">(optional — in case we need to verify)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-sm"
              placeholder="Name"
            />
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none text-sm"
              placeholder="Phone number"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || isAnalyzing || (files.length === 0 && !note.trim())}
          className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors"
        >
          {submitting
            ? "Submitting..."
            : isAnalyzing
              ? "AI is analyzing your files..."
              : files.length > 0
                ? `Submit ${files.length} file${files.length > 1 ? "s" : ""}`
                : "Submit Tip"}
        </button>

        <p className="text-xs text-gray-400 text-center">
          All submissions are confidential and reviewed before being added to the investigation.
        </p>
      </form>
    </div>
  );
}
