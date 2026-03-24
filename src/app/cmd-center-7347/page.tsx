"use client";

import { useEffect, useState } from "react";
import { Tip, Evidence, EvidenceType } from "@/lib/types";

type TabType = "tips" | "evidence" | "sightings" | "timeline";

interface Stats {
  totalTips: number;
  pendingReview: number;
  verified: number;
  critical: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("tips");
  const [tips, setTips] = useState<Tip[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTips: 0,
    pendingReview: 0,
    verified: 0,
    critical: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all tips
      const tipsResponse = await fetch("/api/tips?all=true");
      const tipsData = await tipsResponse.json();
      const tipsArray = tipsData.tips || [];
      setTips(tipsArray);

      // Fetch evidence
      const evidenceResponse = await fetch("/api/evidence");
      const evidenceData = await evidenceResponse.json();
      setEvidence(evidenceData.evidence || []);

      // Calculate stats
      setStats({
        totalTips: tipsArray.length,
        pendingReview: tipsArray.filter(
          (t: Tip) => t.status === "pending" || t.status === "under_review"
        ).length,
        verified: tipsArray.filter((t: Tip) => t.status === "verified").length,
        critical: tipsArray.filter((t: Tip) => t.status === "critical").length,
      });
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTipStatus = async (
    tipId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/tips/${tipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reviewer_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setTips(
          tips.map((tip) =>
            tip.id === tipId ? { ...tip, status: newStatus as any } : tip
          )
        );
        setEditingTipId(null);
        setReviewNotes("");
        loadData();
      }
    } catch (error) {
      console.error("Failed to update tip:", error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900/30 text-yellow-300 border-yellow-700";
      case "under_review":
        return "bg-blue-900/30 text-blue-300 border-blue-700";
      case "verified":
        return "bg-green-900/30 text-green-300 border-green-700";
      case "critical":
        return "bg-red-900/30 text-red-300 border-red-700";
      case "dismissed":
        return "bg-gray-900/30 text-gray-300 border-gray-700";
      default:
        return "bg-gray-900/30 text-gray-300 border-gray-700";
    }
  };

  const getEvidenceTypeLabel = (type: EvidenceType): string => {
    const labels: Record<EvidenceType, string> = {
      photo: "📷 Photo",
      video: "🎥 Video",
      document: "📄 Document",
      screenshot: "🖼️ Screenshot",
      audio: "🎵 Audio",
      social_media_link: "🔗 Social Media",
      other: "📎 Other",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-3xl font-bold mb-2">Investigation Dashboard</h1>
        <p className="text-gray-400">Manage tips, evidence, and sightings</p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 p-6 border-b border-gray-200">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-400 mb-1">Total Tips</div>
          <div className="text-2xl font-bold">{stats.totalTips}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-yellow-400 mb-1">Pending Review</div>
          <div className="text-2xl font-bold text-yellow-300">
            {stats.pendingReview}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-green-400 mb-1">Verified</div>
          <div className="text-2xl font-bold text-green-300">{stats.verified}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-red-400 mb-1">Critical</div>
          <div className="text-2xl font-bold text-red-300">{stats.critical}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {(["tips", "evidence", "sightings", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 font-medium capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Tips Tab */}
        {activeTab === "tips" && (
          <div className="space-y-4">
            {tips.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                No tips yet
              </div>
            ) : (
              tips.map((tip) => (
                <div
                  key={tip.id}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{tip.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                            tip.status
                          )}`}
                        >
                          {tip.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-3">{tip.description}</p>

                      <div className="text-sm text-gray-400 space-y-1">
                        {!tip.is_anonymous && tip.submitter_name && (
                          <div>Submitter: {tip.submitter_name}</div>
                        )}
                        {tip.submitter_email && (
                          <div>Email: {tip.submitter_email}</div>
                        )}
                        {tip.submitter_phone && (
                          <div>Phone: {tip.submitter_phone}</div>
                        )}
                        {tip.tip_date && <div>Tip Date: {tip.tip_date}</div>}
                        {tip.location_description && (
                          <div>Location: {tip.location_description}</div>
                        )}
                        <div>
                          Submitted: {new Date(tip.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {editingTipId === tip.id && (
                      <button
                        onClick={() => setEditingTipId(null)}
                        className="ml-4 text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Review Section */}
                  {editingTipId === tip.id && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                      <label className="block text-sm font-medium mb-2">
                        Reviewer Notes
                      </label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        placeholder="Add reviewer notes..."
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {editingTipId === tip.id ? (
                      <>
                        <button
                          onClick={() =>
                            updateTipStatus(tip.id, "verified")
                          }
                          className="px-4 py-2 bg-green-900/30 text-green-300 border border-green-700 rounded hover:bg-green-900/50 transition-colors text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            updateTipStatus(tip.id, "dismissed")
                          }
                          className="px-4 py-2 bg-gray-900/30 text-gray-300 border border-gray-700 rounded hover:bg-gray-900/50 transition-colors text-sm font-medium"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() =>
                            updateTipStatus(tip.id, "critical")
                          }
                          className="px-4 py-2 bg-red-900/30 text-red-300 border border-red-700 rounded hover:bg-red-900/50 transition-colors text-sm font-medium"
                        >
                          Mark Critical
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingTipId(tip.id);
                            setReviewNotes(tip.reviewer_notes || "");
                          }}
                          className="px-4 py-2 bg-blue-900/30 text-blue-300 border border-blue-700 rounded hover:bg-blue-900/50 transition-colors text-sm font-medium"
                        >
                          Review
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Evidence Tab */}
        {activeTab === "evidence" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {evidence.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 py-12">
                No evidence yet
              </div>
            ) : (
              evidence.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-[#3a3a50] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-white flex items-center justify-center overflow-hidden">
                    {item.file_url && item.mime_type?.startsWith("image") ? (
                      <img
                        src={item.file_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-3xl">
                        {item.evidence_type === "video"
                          ? "🎥"
                          : item.evidence_type === "audio"
                            ? "🎵"
                            : item.evidence_type === "document"
                              ? "📄"
                              : "📎"}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-2 border ${getStatusBadgeColor(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                    <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-gray-400 mb-2">
                      {getEvidenceTypeLabel(item.evidence_type)}
                    </p>
                    {item.submitted_by_name && (
                      <p className="text-xs text-gray-500">
                        By: {item.submitted_by_name}
                      </p>
                    )}
                    {item.capture_date && (
                      <p className="text-xs text-gray-500">
                        {new Date(item.capture_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sightings Tab */}
        {activeTab === "sightings" && (
          <div className="text-center text-gray-400 py-12">
            Sightings management coming soon
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="text-center text-gray-400 py-12">
            Timeline management coming soon
          </div>
        )}
      </div>
    </div>
  );
}
