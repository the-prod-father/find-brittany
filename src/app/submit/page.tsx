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
  description: string;
  captureDate: string;
  metadata?: FileMetadata;
  aiAnalysis?: AIAnalysis | null;
  analyzing?: boolean;
  frameUrl?: string;
}

export default function SubmitTipPage() {
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    submitter_name: "",
    submitter_email: "",
    submitter_phone: "",
    title: "",
    description: "",
    tip_date: "",
    tip_time: "",
    location_description: "",
    latitude: "",
    longitude: "",
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function addFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let type: EvidenceType = "other";
    if (["jpg", "jpeg", "png", "heic", "webp"].includes(ext)) type = "photo";
    else if (["mp4", "mov", "avi", "webm"].includes(ext)) type = "video";
    else if (["pdf", "doc", "docx", "txt"].includes(ext)) type = "document";
    else if (["mp3", "wav", "m4a"].includes(ext)) type = "audio";

    // Extract EXIF/metadata (GPS, capture date, device info)
    let metadata: FileMetadata = {};
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
        // Auto-fill form location if not already set
        if (metadata.latitude && metadata.longitude && !form.latitude && !form.longitude) {
          updateForm("latitude", metadata.latitude.toFixed(6));
          updateForm("longitude", metadata.longitude.toFixed(6));
        }
        // Auto-fill tip date if not already set
        if (metadata.captureDate && !form.tip_date) {
          const d = new Date(metadata.captureDate);
          updateForm("tip_date", d.toISOString().split("T")[0]);
          updateForm("tip_time", d.toTimeString().slice(0, 5));
        }
      }
    } catch {
      // Metadata extraction failed — not all files have EXIF
    }

    setFiles((prev) => [
      ...prev,
      {
        file,
        type,
        description: "",
        captureDate: metadata.captureDate?.split("T")[0] || "",
        metadata,
      },
    ]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFile(index: number, field: keyof FileUpload, value: string) {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      )
    );
  }

  // Extract a frame from a video file using canvas
  function extractVideoFrame(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        // Seek to 1 second in (to get past black frames)
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

  // Analyze a file with Claude Vision AI
  async function analyzeWithAI(index: number) {
    const fileUpload = files[index];
    if (!fileUpload) return;

    // Mark as analyzing
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, analyzing: true } : f))
    );

    try {
      let frameBlob: Blob;

      if (fileUpload.type === "video") {
        // Extract frame from video
        frameBlob = await extractVideoFrame(fileUpload.file);
      } else if (fileUpload.type === "photo" || fileUpload.type === "screenshot") {
        // Use the image directly
        frameBlob = fileUpload.file;
      } else {
        throw new Error("Can only analyze images and videos");
      }

      // Create preview URL
      const frameUrl = URL.createObjectURL(frameBlob);

      // Send to analysis API
      const formData = new FormData();
      formData.append("frame", frameBlob, "frame.jpg");

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Analysis failed");

      const { analysis } = await res.json();

      // Auto-fill form fields from AI analysis
      if (analysis.date && !form.tip_date) {
        // Parse various date formats
        const dateStr = analysis.date.replace(/\//g, "-");
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const isoDate =
            parts[2].length === 4
              ? `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
              : dateStr;
          updateForm("tip_date", isoDate);
        }
      }
      if (analysis.time && !form.tip_time) {
        // Convert "8:14 PM" to 24h format
        const timeStr = analysis.time;
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (match) {
          let hours = parseInt(match[1]);
          const mins = match[2];
          const ampm = match[3]?.toUpperCase();
          if (ampm === "PM" && hours < 12) hours += 12;
          if (ampm === "AM" && hours === 12) hours = 0;
          updateForm("tip_time", `${hours.toString().padStart(2, "0")}:${mins}`);
        }
      }
      if (analysis.location_text && !form.location_description) {
        updateForm("location_description", analysis.location_text);
      }
      if (analysis.camera_name && !fileUpload.description) {
        updateFile(index, "description", `Ring camera: ${analysis.camera_name}`);
      }

      // Auto-generate description from AI analysis
      if (analysis.people_description && !fileUpload.description) {
        updateFile(index, "description", analysis.people_description);
      }

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, analyzing: false, aiAnalysis: analysis, frameUrl }
            : f
        )
      );
    } catch (err) {
      console.error("AI analysis error:", err);
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, analyzing: false } : f
        )
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Build tip payload
      const tipData = {
        ...form,
        is_anonymous: isAnonymous,
        tip_date: form.tip_date && form.tip_time
          ? `${form.tip_date}T${form.tip_time}`
          : form.tip_date || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      };

      // Submit tip via API
      const tipRes = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tipData),
      });

      if (!tipRes.ok) throw new Error("Failed to submit tip");
      const { id: tipId } = await tipRes.json();

      // Upload evidence files
      for (const fileUpload of files) {
        const formData = new FormData();
        formData.append("file", fileUpload.file);
        formData.append("tip_id", tipId);
        formData.append("evidence_type", fileUpload.type);
        formData.append("description", fileUpload.description);
        formData.append("title", fileUpload.file.name);
        if (fileUpload.captureDate) {
          formData.append("capture_date", fileUpload.captureDate);
        }
        // Include extracted GPS metadata
        if (fileUpload.metadata?.latitude) {
          formData.append("latitude", fileUpload.metadata.latitude.toString());
        }
        if (fileUpload.metadata?.longitude) {
          formData.append("longitude", fileUpload.metadata.longitude.toString());
        }
        if (form.submitter_name) formData.append("submitted_by_name", form.submitter_name);
        if (form.submitter_email) formData.append("submitted_by_email", form.submitter_email);

        await fetch("/api/evidence", {
          method: "POST",
          body: formData,
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Submit error:", err);
      alert("There was an error submitting your tip. Please try again or call 516-573-7347.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-6">✓</div>
        <h1 className="text-3xl font-bold mb-4">Thank You</h1>
        <p className="text-[#8888a0] text-lg mb-8">
          Your tip has been submitted and will be reviewed by the investigation
          team. Every piece of information matters — you may have just provided
          the detail that helps bring Brittany home.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/submit"
            onClick={() => { setSubmitted(false); setForm({ submitter_name: "", submitter_email: "", submitter_phone: "", title: "", description: "", tip_date: "", tip_time: "", location_description: "", latitude: "", longitude: "" }); setFiles([]); }}
            className="px-6 py-3 bg-[#1c1c2e] border border-[#2a2a40] rounded-lg hover:bg-[#2a2a40] transition-colors"
          >
            Submit Another Tip
          </a>
          <a
            href="/map"
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
          >
            View Investigation Map
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Submit a Tip</h1>
        <p className="text-[#8888a0]">
          Any information could help find Brittany. You can submit anonymously.
          All tips are reviewed before being added to the investigation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Anonymous Toggle */}
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Information</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm text-[#8888a0]">Submit anonymously</span>
            </label>
          </div>

          {!isAnonymous && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#8888a0] mb-1">Name</label>
                <input
                  type="text"
                  value={form.submitter_name}
                  onChange={(e) => updateForm("submitter_name", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8888a0] mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.submitter_phone}
                  onChange={(e) => updateForm("submitter_phone", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
                  placeholder="(xxx) xxx-xxxx"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-[#8888a0] mb-1">Email</label>
                <input
                  type="email"
                  value={form.submitter_email}
                  onChange={(e) => updateForm("submitter_email", e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tip Details */}
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">What Did You See or Know?</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">
                Brief Summary <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateForm("title", e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="e.g., Possible sighting near Oyster Bay train station"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">
                Full Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                required
                rows={5}
                className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none resize-y"
                placeholder="Describe what you saw, heard, or know in as much detail as possible. Include any details about appearance, direction of travel, behavior, companions, etc."
              />
            </div>
          </div>
        </div>

        {/* When & Where */}
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">When & Where</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Date</label>
              <input
                type="date"
                value={form.tip_date}
                onChange={(e) => updateForm("tip_date", e.target.value)}
                className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">Time (approx)</label>
              <input
                type="time"
                value={form.tip_time}
                onChange={(e) => updateForm("tip_time", e.target.value)}
                className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-[#8888a0] mb-1">
                Location Description
              </label>
              <input
                type="text"
                value={form.location_description}
                onChange={(e) => updateForm("location_description", e.target.value)}
                className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="e.g., Corner of South Street and Spring Street, near the deli"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">
                Latitude (optional)
              </label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => updateForm("latitude", e.target.value)}
                className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="40.8715"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8888a0] mb-1">
                Longitude (optional)
              </label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => updateForm("longitude", e.target.value)}
                className="w-full px-3 py-2 bg-[#0f0f1a] border border-[#2a2a40] rounded-lg focus:border-red-500 focus:outline-none"
                placeholder="-73.5320"
              />
            </div>
          </div>
        </div>

        {/* Evidence Upload */}
        <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-2">Attach Evidence</h2>
          <p className="text-sm text-[#8888a0] mb-4">
            Upload photos, videos, screenshots, documents, or any other files.
            All uploads are reviewed before being added to the investigation.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={(e) => {
              const fileList = e.target.files;
              if (fileList) {
                Array.from(fileList).forEach(addFile);
              }
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-[#2a2a40] rounded-lg hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📎</div>
              <div className="text-sm text-[#8888a0]">
                Click to upload files — photos, videos, documents, screenshots
              </div>
              <div className="text-xs text-[#555570] mt-1">
                Max 50MB per file
              </div>
            </div>
          </button>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-3">
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-[#0f0f1a] rounded-lg p-3"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {f.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-red-400 text-xs hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={f.type}
                        onChange={(e) => updateFile(i, "type", e.target.value)}
                        className="text-xs bg-[#161625] border border-[#2a2a40] rounded px-2 py-1"
                      >
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                        <option value="document">Document</option>
                        <option value="screenshot">Screenshot</option>
                        <option value="audio">Audio</option>
                        <option value="social_media_link">Social Media</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Description of this file"
                        value={f.description}
                        onChange={(e) => updateFile(i, "description", e.target.value)}
                        className="flex-1 text-xs bg-[#161625] border border-[#2a2a40] rounded px-2 py-1"
                      />
                    </div>
                    <div className="text-xs text-[#555570]">
                      {(f.file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                    {f.metadata && (f.metadata.latitude || f.metadata.captureDate || f.metadata.model) && (
                      <div className="mt-1.5 p-2 bg-green-900/20 border border-green-800/30 rounded text-xs space-y-0.5">
                        <div className="text-green-400 font-semibold text-[10px] uppercase tracking-wider">EXIF Metadata</div>
                        {f.metadata.captureDate && (
                          <div className="text-[#a0a0b0]">Captured: {new Date(f.metadata.captureDate).toLocaleString()}</div>
                        )}
                        {f.metadata.latitude && f.metadata.longitude && (
                          <div className="text-[#a0a0b0]">GPS: {f.metadata.latitude.toFixed(5)}, {f.metadata.longitude.toFixed(5)}</div>
                        )}
                        {f.metadata.make && (
                          <div className="text-[#a0a0b0]">Device: {f.metadata.make} {f.metadata.model || ""}</div>
                        )}
                      </div>
                    )}

                    {/* AI Analysis Button */}
                    {(f.type === "video" || f.type === "photo" || f.type === "screenshot") && !f.aiAnalysis && (
                      <button
                        type="button"
                        onClick={() => analyzeWithAI(i)}
                        disabled={f.analyzing}
                        className="mt-2 w-full py-2 px-3 bg-blue-600/20 border border-blue-500/30 rounded text-xs font-semibold text-blue-400 hover:bg-blue-600/30 disabled:opacity-50 transition-colors"
                      >
                        {f.analyzing ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400" />
                            Analyzing with AI...
                          </span>
                        ) : (
                          "Analyze with AI — Extract timestamp, people, details"
                        )}
                      </button>
                    )}

                    {/* AI Analysis Results */}
                    {f.aiAnalysis && (
                      <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs space-y-1.5">
                        <div className="text-blue-400 font-semibold text-[10px] uppercase tracking-wider">AI Analysis</div>
                        {f.frameUrl && (
                          <img src={f.frameUrl} alt="Analyzed frame" className="w-full rounded mb-2 opacity-80" />
                        )}
                        {f.aiAnalysis.date && (
                          <div className="text-[#a0a0b0]">Date: <span className="text-white">{f.aiAnalysis.date}</span></div>
                        )}
                        {f.aiAnalysis.time && (
                          <div className="text-[#a0a0b0]">Time: <span className="text-white">{f.aiAnalysis.time}</span></div>
                        )}
                        {f.aiAnalysis.camera_name && (
                          <div className="text-[#a0a0b0]">Camera: <span className="text-white">{f.aiAnalysis.camera_name}</span></div>
                        )}
                        {f.aiAnalysis.location_text && (
                          <div className="text-[#a0a0b0]">Location: <span className="text-white">{f.aiAnalysis.location_text}</span></div>
                        )}
                        {f.aiAnalysis.people_visible && (
                          <div className="text-[#a0a0b0]">People: <span className="text-yellow-400">{f.aiAnalysis.people_count} — {f.aiAnalysis.people_description}</span></div>
                        )}
                        {f.aiAnalysis.vehicles_visible && f.aiAnalysis.vehicle_description && (
                          <div className="text-[#a0a0b0]">Vehicle: <span className="text-white">{f.aiAnalysis.vehicle_description}</span></div>
                        )}
                        {f.aiAnalysis.environment && (
                          <div className="text-[#a0a0b0]">Scene: <span className="text-white">{f.aiAnalysis.environment}</span></div>
                        )}
                        {f.aiAnalysis.lighting && (
                          <div className="text-[#a0a0b0]">Lighting: <span className="text-white">{f.aiAnalysis.lighting}</span></div>
                        )}
                        {f.aiAnalysis.notable_details && (
                          <div className="text-[#a0a0b0]">Details: <span className="text-red-400 font-medium">{f.aiAnalysis.notable_details}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <a
            href="/"
            className="px-6 py-3 text-[#8888a0] hover:text-white transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            disabled={submitting || !form.title || !form.description}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Tip"}
          </button>
        </div>

        <p className="text-xs text-[#555570] text-center">
          All submissions are confidential and reviewed by the investigation
          team before being made visible. Your IP address is not stored.
        </p>
      </form>
    </div>
  );
}
