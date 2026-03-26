"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import exifr from "exifr";
import AddressSearch from "@/components/AddressSearch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EvidenceType = "photo" | "video" | "document" | "screenshot" | "audio" | "social_media_link" | "other";

interface FileMetadata {
  latitude?: number;
  longitude?: number;
  captureDate?: string;
}

interface AIAnalysis {
  date?: string | null;
  time?: string | null;
  camera_name?: string | null;
  people_description?: string | null;
  environment?: string | null;
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

function getFileType(file: File): EvidenceType {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "heic", "webp"].includes(ext)) return "photo";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return "document";
  if (["mp3", "wav", "m4a"].includes(ext)) return "audio";
  return "other";
}

export default function SubmitPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=upload, 2=location, 3=done
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [location, setLocation] = useState({ address: "", lat: "", lng: "" });
  const [locationNote, setLocationNote] = useState("");
  const [note, setNote] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detectedDate, setDetectedDate] = useState("");
  const [detectedTime, setDetectedTime] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // EXIF extraction
  async function addFiles(fileList: FileList) {
    const newFiles: FileUpload[] = [];
    for (const file of Array.from(fileList)) {
      const type = getFileType(file);
      let metadata: FileMetadata = {};
      try {
        const exif = await exifr.parse(file, {
          gps: true,
          pick: ["DateTimeOriginal", "CreateDate", "GPSLatitude", "GPSLongitude"],
        });
        if (exif) {
          metadata = {
            latitude: exif.latitude,
            longitude: exif.longitude,
            captureDate: exif.DateTimeOriginal?.toISOString?.() || exif.CreateDate?.toISOString?.(),
          };
          // Auto-fill location from EXIF if available
          if (metadata.latitude && metadata.longitude && !location.lat) {
            setLocation({
              address: `${metadata.latitude.toFixed(5)}, ${metadata.longitude.toFixed(5)}`,
              lat: metadata.latitude.toFixed(6),
              lng: metadata.longitude.toFixed(6),
            });
          }
          // Auto-fill date/time from EXIF
          if (metadata.captureDate && !detectedDate) {
            const d = new Date(metadata.captureDate);
            setDetectedDate(d.toISOString().split("T")[0]);
            setDetectedTime(d.toTimeString().slice(0, 5));
          }
        }
      } catch { /* no EXIF */ }
      newFiles.push({ file, type, metadata });
    }
    setFiles((prev) => [...prev, ...newFiles]);

    // Auto-trigger AI analysis for video/image
    const startIdx = files.length;
    for (let i = 0; i < newFiles.length; i++) {
      if (newFiles[i].type === "video" || newFiles[i].type === "photo") {
        analyzeWithAI(startIdx + i, [...files, ...newFiles]);
      }
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Video frame extraction
  function extractFrame(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1); };
      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No ctx"));
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          blob ? resolve(blob) : reject(new Error("No blob"));
        }, "image/jpeg", 0.9);
      };
      video.onerror = () => reject(new Error("Video error"));
      video.src = URL.createObjectURL(file);
    });
  }

  async function analyzeWithAI(index: number, currentFiles?: FileUpload[]) {
    const fileList = currentFiles || files;
    const f = fileList[index];
    if (!f) return;

    setFiles((prev) => prev.map((x, i) => (i === index ? { ...x, analyzing: true } : x)));

    try {
      const frameBlob = f.type === "video" ? await extractFrame(f.file) : f.file;
      const frameUrl = URL.createObjectURL(frameBlob);
      const formData = new FormData();
      formData.append("frame", frameBlob, "frame.jpg");

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed");
      const { analysis } = await res.json();

      // Auto-fill date/time from AI if EXIF didn't have it
      if (analysis.date && !detectedDate) {
        // Parse formats like "03/20/2026", "03-20-2026", "2026-03-20"
        const dateStr = analysis.date.replace(/\//g, "-");
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const isoDate = parts[2].length === 4
            ? `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
            : parts[0].length === 4
              ? dateStr
              : dateStr;
          setDetectedDate(isoDate);
        }
      }
      if (analysis.time && !detectedTime) {
        const match = analysis.time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
        if (match) {
          let hours = parseInt(match[1]);
          const mins = match[2];
          const ampm = match[4]?.toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          setDetectedTime(`${hours.toString().padStart(2, "0")}:${mins}`);
        }
      }

      setFiles((prev) =>
        prev.map((x, i) => (i === index ? { ...x, analyzing: false, aiAnalysis: analysis, frameUrl } : x))
      );
    } catch {
      setFiles((prev) => prev.map((x, i) => (i === index ? { ...x, analyzing: false } : x)));
    }
  }

  const handleLocationSelect = useCallback(({ address, lat, lng }: { address: string; lat: number; lng: number }) => {
    setLocation({ address, lat: lat.toFixed(6), lng: lng.toFixed(6) });
  }, []);

  const hasLocation = !!(location.lat && location.lng) || locationNote.trim().length > 0;
  const canSubmit = files.length > 0 && hasLocation && !submitting;
  const isAnalyzing = files.some((f) => f.analyzing);

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      // Create tip
      const tipRes = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Evidence: ${files.length} file${files.length > 1 ? "s" : ""} from ${location.address || locationNote}`,
          description: note || `Evidence uploaded from ${location.address || locationNote}`,
          submitter_name: contactName || null,
          submitter_phone: contactPhone || null,
          is_anonymous: !contactName && !contactPhone,
          latitude: location.lat ? parseFloat(location.lat) : null,
          longitude: location.lng ? parseFloat(location.lng) : null,
          location_description: location.address || locationNote || null,
        }),
      });
      if (!tipRes.ok) throw new Error("Failed");
      const { id: tipId } = await tipRes.json();

      // Upload files directly to Supabase storage
      for (const f of files) {
        const ts = Date.now();
        const rnd = Math.random().toString(36).substring(7);
        // Sanitize filename — remove spaces, special chars
        const safeName = f.file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
        const filename = `${ts}-${rnd}-${safeName}`;

        await supabase.storage.from("evidence").upload(filename, f.file, { contentType: f.file.type });
        const { data: urlData } = supabase.storage.from("evidence").getPublicUrl(filename);

        await fetch("/api/evidence/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tip_id: tipId,
            evidence_type: f.type,
            title: f.aiAnalysis?.camera_name
              ? `${f.aiAnalysis.camera_name} — ${f.file.name}`
              : f.file.name,
            description: [
              f.aiAnalysis?.environment,
              f.aiAnalysis?.people_description,
              f.aiAnalysis?.notable_details,
              note,
            ].filter(Boolean).join(". ") || "",
            file_path: `evidence/${filename}`,
            file_url: urlData.publicUrl,
            file_size_bytes: f.file.size,
            mime_type: f.file.type,
            original_filename: f.file.name,
            capture_date: f.metadata?.captureDate || (detectedDate ? `${detectedDate}${detectedTime ? "T" + detectedTime + ":00" : ""}` : null),
            latitude: location.lat ? parseFloat(location.lat) : f.metadata?.latitude || null,
            longitude: location.lng ? parseFloat(location.lng) : f.metadata?.longitude || null,
            location_description: location.address || locationNote || null,
            submitted_by_name: contactName || null,
          }),
        });
      }

      setStep(3);
    } catch (err) {
      console.error(err);
      alert("Error submitting. Please try again or call 516-573-7347.");
    } finally {
      setSubmitting(false);
    }
  }

  // Step 3: Success
  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-3xl font-bold mb-3">Thank You</h1>
        <p className="text-gray-500 text-lg mb-8">
          Your evidence has been submitted and will be reviewed. Every piece of information matters.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => { setStep(1); setFiles([]); setLocation({ address: "", lat: "", lng: "" }); setLocationNote(""); setNote(""); setContactName(""); setContactPhone(""); }}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Upload More
          </button>
          <a href="/" className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Upload Evidence</h1>
        <p className="text-gray-500">
          Photos, videos, or screenshots that could help find Brittany.
          <br />AI will automatically read timestamps and details.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 1 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500"}`}>
          <span className="w-5 h-5 rounded-full bg-current text-white flex items-center justify-center text-xs" style={{ backgroundColor: step === 1 ? "#dc2626" : "#d1d5db" }}>1</span>
          Files
        </div>
        <div className="w-8 h-px bg-gray-300" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 2 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500"}`}>
          <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-xs" style={{ backgroundColor: step === 2 ? "#dc2626" : "#d1d5db" }}>2</span>
          Details
        </div>
      </div>

      {/* Step 1: Upload files */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf"
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-14 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-400 hover:bg-red-50/50 transition-colors cursor-pointer"
            >
              <div className="text-center">
                <div className="text-4xl mb-3">📎</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  Tap to upload files
                </div>
                <div className="text-sm text-gray-500">
                  Ring videos, photos, screenshots — anything helpful
                </div>
              </div>
            </button>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span>{f.type === "video" ? "🎥" : f.type === "photo" ? "📷" : "📎"}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{f.file.name}</div>
                        <div className="text-xs text-gray-500">
                          {(f.file.size / 1024 / 1024).toFixed(1)} MB
                          {f.analyzing && " · AI reading..."}
                          {f.aiAnalysis?.date && ` · ${f.aiAnalysis.date}`}
                          {f.aiAnalysis?.camera_name && ` · ${f.aiAnalysis.camera_name}`}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 text-sm ml-2">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detected info from files */}
          {(detectedDate || files.some(f => f.aiAnalysis)) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">Extracted from your files</div>
              <div className="flex flex-wrap gap-3 text-sm">
                {detectedDate && (
                  <div className="text-gray-600">Date: <span className="font-semibold text-gray-900">{detectedDate}</span></div>
                )}
                {detectedTime && (
                  <div className="text-gray-600">Time: <span className="font-semibold text-gray-900">{detectedTime}</span></div>
                )}
                {files.some(f => f.aiAnalysis?.camera_name) && (
                  <div className="text-gray-600">Camera: <span className="font-semibold text-gray-900">{files.find(f => f.aiAnalysis?.camera_name)?.aiAnalysis?.camera_name}</span></div>
                )}
                {files.some(f => f.aiAnalysis?.environment) && (
                  <div className="text-gray-600">Scene: <span className="font-semibold text-gray-900">{files.find(f => f.aiAnalysis?.environment)?.aiAnalysis?.environment}</span></div>
                )}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <button
              onClick={() => setStep(2)}
              disabled={isAnalyzing}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300 disabled:text-gray-500 rounded-xl font-semibold text-lg transition-colors"
            >
              {isAnalyzing ? "AI is reading your files..." : "Next — Add Location"}
            </button>
          )}
        </div>
      )}

      {/* Step 2: Location + details */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Location — MANDATORY */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <label className="block text-base font-semibold text-gray-900 mb-1">
              Where was this captured? <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-500 mb-3">
              Search for the address, street, or nearest landmark. This helps us place the evidence on the investigation map.
            </p>
            <AddressSearch
              onSelect={handleLocationSelect}
              placeholder="Start typing an address..."
            />

            {location.address && (
              <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
                ✓ {location.address}
              </div>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500 mb-2">
                Don't know the exact address? Describe the location:
              </p>
              <input
                type="text"
                value={locationNote}
                onChange={(e) => setLocationNote(e.target.value)}
                placeholder="e.g., McCouns Lane near the intersection with Berry Hill, or 'contact John at 516-xxx-xxxx for exact address'"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Optional note */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 focus:outline-none resize-y"
              placeholder="Anything else you want to tell us..."
            />
          </div>

          {/* Contact info */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your contact info <span className="text-gray-400">(optional — in case we need to verify)</span>
            </label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Name"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 focus:outline-none"
              />
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-4 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-200 disabled:text-gray-400 rounded-xl font-semibold text-lg transition-colors"
            >
              {submitting
                ? "Submitting..."
                : !hasLocation
                  ? "Add a location to continue"
                  : `Submit ${files.length} file${files.length > 1 ? "s" : ""}`}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            All submissions are confidential and reviewed before being added to the investigation.
          </p>
        </div>
      )}
    </div>
  );
}
