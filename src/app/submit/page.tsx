"use client";

import { useState, useRef } from "react";

type EvidenceType = "photo" | "video" | "document" | "screenshot" | "audio" | "social_media_link" | "other";

interface FileUpload {
  file: File;
  type: EvidenceType;
  description: string;
  captureDate: string;
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

  function addFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let type: EvidenceType = "other";
    if (["jpg", "jpeg", "png", "heic", "webp"].includes(ext)) type = "photo";
    else if (["mp4", "mov", "avi", "webm"].includes(ext)) type = "video";
    else if (["pdf", "doc", "docx", "txt"].includes(ext)) type = "document";
    else if (["mp3", "wav", "m4a"].includes(ext)) type = "audio";

    setFiles((prev) => [
      ...prev,
      { file, type, description: "", captureDate: "" },
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
