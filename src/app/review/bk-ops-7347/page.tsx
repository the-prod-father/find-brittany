"use client";

import { useEffect, useState } from "react";
import type { Evidence, Tip } from "@/lib/types";
import AddressSearch from "@/components/AddressSearch";

export default function AdminReviewPage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"evidence" | "tips">("evidence");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [evRes, tipRes] = await Promise.all([
          fetch("/api/evidence"),
          fetch("/api/tips?all=true"),
        ]);
        const evData = await evRes.json();
        const tipData = await tipRes.json();
        setEvidence(evData.evidence || []);
        setTips(tipData.tips || []);
      } catch (err) {
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function startEdit(ev: Evidence) {
    setEditingId(ev.id);
    setEditForm({
      title: ev.title || "",
      description: ev.description || "",
      latitude: ev.latitude?.toString() || "",
      longitude: ev.longitude?.toString() || "",
      location_description: ev.location_description || "",
      capture_date: ev.capture_date ? ev.capture_date.slice(0, 16) : "",
      reviewer_notes: ev.reviewer_notes || "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.title) payload.title = editForm.title;
      if (editForm.description) payload.description = editForm.description;
      if (editForm.latitude) payload.latitude = parseFloat(editForm.latitude);
      if (editForm.longitude) payload.longitude = parseFloat(editForm.longitude);
      if (editForm.location_description) payload.location_description = editForm.location_description;
      if (editForm.capture_date) payload.capture_date = editForm.capture_date;
      if (editForm.reviewer_notes) payload.reviewer_notes = editForm.reviewer_notes;

      const res = await fetch(`/api/evidence/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const { data } = await res.json();
        setEvidence((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
        setEditingId(null);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string, type: "evidence" | "tip") {
    const url = type === "evidence" ? `/api/evidence/${id}` : `/api/tips/${id}`;
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewed_at: new Date().toISOString() }),
      });
      if (res.ok) {
        if (type === "evidence") {
          setEvidence((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: status as Evidence["status"] } : e))
          );
        } else {
          setTips((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status: status as Tip["status"] } : t))
          );
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  const pendingEvidence = evidence.filter((e) => e.status === "pending");
  const pendingTips = tips.filter((t) => t.status === "pending" || t.status === "under_review");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Case Review</h1>
          <p className="text-gray-500 text-sm">
            {pendingEvidence.length} evidence pending · {pendingTips.length} tips pending
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab("evidence")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "evidence"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Evidence ({evidence.length})
          </button>
          <button
            onClick={() => setTab("tips")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "tips"
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Tips ({tips.length})
          </button>
        </div>

        {/* Evidence Tab */}
        {tab === "evidence" && (
          <div className="space-y-4">
            {evidence.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No evidence submitted yet.</p>
            ) : (
              evidence.map((ev) => (
                <div
                  key={ev.id}
                  className={`bg-white border rounded-xl overflow-hidden ${
                    ev.status === "pending"
                      ? "border-amber-300"
                      : ev.status === "verified"
                        ? "border-green-300"
                        : "border-gray-200"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex gap-6">
                      {/* Media preview */}
                      <div className="w-80 flex-shrink-0">
                        {ev.file_url && ev.mime_type?.startsWith("video") ? (
                          <video
                            src={ev.file_url}
                            controls
                            className="w-full rounded-lg bg-gray-100"
                          />
                        ) : ev.file_url && ev.mime_type?.startsWith("image") ? (
                          <img
                            src={ev.file_url}
                            alt={ev.title}
                            className="w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-3xl">
                            📎
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                              ev.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : ev.status === "verified"
                                  ? "bg-green-100 text-green-800"
                                  : ev.status === "dismissed"
                                    ? "bg-gray-100 text-gray-600"
                                    : ev.status === "critical"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {ev.status}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">{ev.evidence_type}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(ev.created_at).toLocaleString()}
                          </span>
                        </div>

                        {editingId === ev.id ? (
                          /* Edit form */
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                              <input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                              <textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Location (search address)</label>
                              <AddressSearch
                                defaultValue={editForm.location_description}
                                placeholder="Type address to auto-fill GPS..."
                                onSelect={({ address, lat, lng }) => {
                                  setEditForm({
                                    ...editForm,
                                    latitude: lat.toFixed(6),
                                    longitude: lng.toFixed(6),
                                    location_description: address,
                                  });
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                                <input
                                  value={editForm.latitude}
                                  onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                                  placeholder="40.8728"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                                <input
                                  value={editForm.longitude}
                                  onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                                  placeholder="-73.5340"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Capture date/time</label>
                              <input
                                type="datetime-local"
                                value={editForm.capture_date}
                                onChange={(e) => setEditForm({ ...editForm, capture_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Reviewer notes</label>
                              <textarea
                                value={editForm.reviewer_notes}
                                onChange={(e) => setEditForm({ ...editForm, reviewer_notes: e.target.value })}
                                rows={2}
                                placeholder="Internal notes about this evidence..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(ev.id)}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                              >
                                {saving ? "Saving..." : "Save Changes"}
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Display mode */
                          <>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{ev.title}</h3>
                            {ev.description && (
                              <p className="text-sm text-gray-600 mb-3">{ev.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                              <div className="text-gray-500">
                                GPS: {ev.latitude && ev.longitude ? (
                                  <span className="text-gray-900">{ev.latitude.toFixed(5)}, {ev.longitude.toFixed(5)}</span>
                                ) : (
                                  <span className="text-amber-600 font-medium">Missing — click Edit to add</span>
                                )}
                              </div>
                              <div className="text-gray-500">
                                Captured: {ev.capture_date ? (
                                  <span className="text-gray-900">{new Date(ev.capture_date).toLocaleString()}</span>
                                ) : (
                                  <span className="text-amber-600 font-medium">Missing</span>
                                )}
                              </div>
                              {ev.location_description && (
                                <div className="text-gray-500">Location: <span className="text-gray-900">{ev.location_description}</span></div>
                              )}
                              {ev.submitted_by_name && (
                                <div className="text-gray-500">From: <span className="text-gray-900">{ev.submitted_by_name}</span></div>
                              )}
                              <div className="text-gray-500">File: <span className="text-gray-900">{ev.original_filename} · {ev.mime_type} · {ev.file_size_bytes ? (ev.file_size_bytes / 1024 / 1024).toFixed(1) + " MB" : ""}</span></div>
                            </div>

                            {ev.reviewer_notes && (
                              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                                <span className="text-xs font-medium text-gray-500 uppercase">Notes:</span> {ev.reviewer_notes}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => startEdit(ev)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                              >
                                Edit Details
                              </button>
                              {ev.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => updateStatus(ev.id, "verified", "evidence")}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => updateStatus(ev.id, "critical", "evidence")}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                                  >
                                    Mark Critical
                                  </button>
                                  <button
                                    onClick={() => updateStatus(ev.id, "dismissed", "evidence")}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-500 rounded-lg text-sm hover:bg-gray-50"
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                              {ev.status !== "pending" && (
                                <button
                                  onClick={() => updateStatus(ev.id, "pending", "evidence")}
                                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                                >
                                  Reset to Pending
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tips Tab */}
        {tab === "tips" && (
          <div className="space-y-3">
            {tips.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No tips submitted yet.</p>
            ) : (
              tips.map((tip) => (
                <div
                  key={tip.id}
                  className={`bg-white border rounded-xl p-5 ${
                    tip.status === "pending"
                      ? "border-amber-300"
                      : tip.status === "verified"
                        ? "border-green-300"
                        : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                            tip.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : tip.status === "verified"
                                ? "bg-green-100 text-green-800"
                                : tip.status === "critical"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tip.status}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(tip.created_at).toLocaleString()}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{tip.title}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{tip.description}</p>

                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-500 mb-4">
                    {tip.submitter_name && !tip.is_anonymous && <div>From: <span className="text-gray-900">{tip.submitter_name}</span></div>}
                    {tip.submitter_phone && <div>Phone: <span className="text-gray-900">{tip.submitter_phone}</span></div>}
                    {tip.submitter_email && <div>Email: <span className="text-gray-900">{tip.submitter_email}</span></div>}
                    {tip.tip_date && <div>Date: <span className="text-gray-900">{new Date(tip.tip_date).toLocaleString()}</span></div>}
                    {tip.location_description && <div>Location: <span className="text-gray-900">{tip.location_description}</span></div>}
                    {tip.latitude && <div>GPS: <span className="text-gray-900">{tip.latitude}, {tip.longitude}</span></div>}
                  </div>

                  {tip.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(tip.id, "verified", "tip")}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(tip.id, "critical", "tip")}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        Critical
                      </button>
                      <button
                        onClick={() => updateStatus(tip.id, "under_review", "tip")}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Under Review
                      </button>
                      <button
                        onClick={() => updateStatus(tip.id, "dismissed", "tip")}
                        className="px-3 py-1.5 border border-gray-300 text-gray-500 rounded-lg text-sm hover:bg-gray-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
