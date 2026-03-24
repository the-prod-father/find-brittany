"use client";

import { useEffect, useState } from "react";
import type { TimelineEvent } from "@/lib/types";

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  sighting: { label: "Sighting", icon: "👁", color: "#ef4444" },
  police_action: { label: "Police", icon: "🚔", color: "#3b82f6" },
  search_effort: { label: "Search", icon: "🔦", color: "#22c55e" },
  media: { label: "News", icon: "📰", color: "#a855f7" },
  tip: { label: "Tip", icon: "💡", color: "#eab308" },
  evidence: { label: "Evidence", icon: "📎", color: "#f97316" },
  other: { label: "Event", icon: "📌", color: "#6b7280" },
};

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  // Group by date
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const e of sorted) {
    const dateKey = new Date(e.event_date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(e);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Investigation Timeline</h1>
        <p className="text-gray-500">
          Everything we know, in order. Updated as new information comes in.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {events.length} events · Last updated {new Date().toLocaleDateString()}
        </p>
      </div>

      {Object.entries(grouped).map(([date, dayEvents]) => (
        <div key={date} className="mb-8">
          {/* Date header */}
          <div className="sticky top-14 sm:top-16 bg-white/95 backdrop-blur z-10 py-2 mb-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">{date}</h2>
          </div>

          {/* Events for this date */}
          <div className="space-y-3">
            {dayEvents.map((event) => {
              const config = TYPE_CONFIG[event.event_type] || TYPE_CONFIG.other;
              return (
                <div
                  key={event.id}
                  className={`border rounded-xl p-4 ${event.is_pinned ? "border-red-200 bg-red-50/50" : "border-gray-200"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg mt-0.5">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: config.color + "15", color: config.color }}
                        >
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.event_date).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {event.is_pinned && (
                          <span className="text-[10px] font-bold text-red-600 uppercase">Key Event</span>
                        )}
                      </div>

                      <h3 className="text-base font-semibold text-gray-900 mb-1">
                        {event.title}
                      </h3>

                      {event.description && (
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">
                          {event.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {event.location_description && (
                          <span>📍 {event.location_description}</span>
                        )}
                        {event.source && (
                          <span>
                            Source:{" "}
                            {event.source_url ? (
                              <a
                                href={event.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {event.source}
                              </a>
                            ) : (
                              event.source
                            )}
                          </span>
                        )}
                        {event.latitude && event.longitude && (
                          <a
                            href={`https://www.google.com/maps/@${event.latitude},${event.longitude},18z`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View on map
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Bottom CTA */}
      <div className="mt-12 text-center border border-gray-200 rounded-xl p-6">
        <p className="text-gray-500 text-sm mb-3">Have information about Brittany?</p>
        <div className="flex justify-center gap-3">
          <a
            href="/submit"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Upload Evidence
          </a>
          <a
            href="tel:5165737347"
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Call 516-573-7347
          </a>
        </div>
      </div>
    </div>
  );
}
