"use client";

import { useMemo } from "react";

interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  description: string;
  location?: string;
  source?: string;
  type: "sighting" | "police_action" | "search_effort" | "media" | "other";
}

// Seed data with investigation events
const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "1",
    date: "March 20, 2026",
    time: "8:00 PM",
    title: "Brittany exits moving vehicle",
    description:
      "Brittany is observed exiting a vehicle. The circumstances and exact location of this sighting are under investigation.",
    location: "Oyster Bay vicinity",
    source: "Witness report",
    type: "other",
  },
  {
    id: "2",
    date: "March 20, 2026",
    time: "8:14 PM",
    title: "Last confirmed sighting — McCouns Lane",
    description:
      "Final confirmed sighting of Brittany. She was last seen on McCouns Lane in Oyster Bay. This marks the critical point in the investigation timeline.",
    location: "McCouns Lane, Oyster Bay, NY",
    source: "Witness observation",
    type: "sighting",
  },
  {
    id: "3",
    date: "March 20, 2026",
    time: "8:30 PM",
    title: "Reported missing to police",
    description:
      "Brittany's disappearance was reported to Nassau County Police Department. An investigation was immediately initiated.",
    location: "Nassau County Police Department",
    source: "Police dispatch",
    type: "police_action",
  },
  {
    id: "4",
    date: "March 20, 2026",
    time: "~9:00 PM",
    title: "Helicopter and drone search launched",
    description:
      "Search and rescue operations began with helicopter and drone deployment to search the surrounding areas. Ground crews were also deployed.",
    location: "Oyster Bay and surrounding areas",
    source: "NCPD / Search & Rescue",
    type: "search_effort",
  },
  {
    id: "5",
    date: "March 22, 2026",
    time: "Unknown",
    title: "News 12 coverage — family pleads for help",
    description:
      "The case received media coverage on News 12. Brittany's family made a public plea for information about her whereabouts, urging anyone with information to come forward.",
    location: "Media broadcast",
    source: "News 12 New York",
    type: "media",
  },
];

const EVENT_TYPE_CONFIG = {
  sighting: {
    color: "#ef4444", // red-500
    label: "Sighting",
    bgClass: "bg-red-500 bg-opacity-10",
    borderClass: "border-red-500 border-opacity-30",
  },
  police_action: {
    color: "#3b82f6", // blue-500
    label: "Police Action",
    bgClass: "bg-blue-500 bg-opacity-10",
    borderClass: "border-blue-500 border-opacity-30",
  },
  search_effort: {
    color: "#22c55e", // green-500
    label: "Search Effort",
    bgClass: "bg-green-500 bg-opacity-10",
    borderClass: "border-green-500 border-opacity-30",
  },
  media: {
    color: "#a855f7", // purple-500
    label: "Media",
    bgClass: "bg-purple-500 bg-opacity-10",
    borderClass: "border-purple-500 border-opacity-30",
  },
  other: {
    color: "#6b7280", // gray-500
    label: "Other",
    bgClass: "bg-gray-500 bg-opacity-10",
    borderClass: "border-gray-500 border-opacity-30",
  },
};

export default function TimelinePage() {
  const sortedEvents = useMemo(() => {
    return [...TIMELINE_EVENTS].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-[#f0f0f5] mb-2">
            Investigation Timeline
          </h1>
          <p className="text-lg text-[#8888a0]">
            Critical events in the search for Brittany Kritis-Garip
          </p>
        </div>

        {/* Timeline Legend */}
        <div className="mb-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
            <div
              key={type}
              className="flex items-center gap-2 p-2 rounded-md text-xs font-medium"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              ></div>
              <span className="text-[#d0d0dc]">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Vertical Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2a2a40] via-[#2a2a40] to-transparent transform -translate-x-1/2"></div>

          {/* Timeline Events */}
          <div className="space-y-8">
            {sortedEvents.map((event, index) => {
              const config = EVENT_TYPE_CONFIG[event.type];
              const isLeft = index % 2 === 0;

              return (
                <div
                  key={event.id}
                  className={`flex ${isLeft ? "flex-row" : "flex-row-reverse"}`}
                >
                  {/* Left/Right Content Container */}
                  <div className={`w-1/2 ${isLeft ? "pr-8" : "pl-8"}`}>
                    {/* Card */}
                    <div
                      className={`${config.bgClass} ${config.borderClass} border rounded-lg p-5 backdrop-blur-sm hover:border-opacity-100 transition-all duration-300 hover:shadow-lg hover:shadow-black`}
                    >
                      {/* Header */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider">
                              {config.label}
                            </p>
                            <p className="text-sm font-bold text-[#f0f0f5] mt-1">
                              {event.title}
                            </p>
                          </div>
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                            style={{ backgroundColor: config.color }}
                          ></div>
                        </div>
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-4 mb-3 pb-3 border-b border-[#2a2a40]">
                        <p className="text-sm font-semibold text-[#d0d0dc]">
                          {event.date}
                        </p>
                        <p className="text-sm text-[#a0a0b0]">{event.time}</p>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[#d0d0dc] mb-3 leading-relaxed">
                        {event.description}
                      </p>

                      {/* Location and Source */}
                      <div className="space-y-2 text-xs">
                        {event.location && (
                          <div>
                            <span className="text-[#8888a0]">Location: </span>
                            <span className="text-[#a0a0b0]">
                              {event.location}
                            </span>
                          </div>
                        )}
                        {event.source && (
                          <div>
                            <span className="text-[#8888a0]">Source: </span>
                            <span className="text-[#a0a0b0]">
                              {event.source}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center Dot and Circle Marker (visible on md and up) */}
                  <div className="w-0 flex justify-center">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      {/* Outer Circle Pulse */}
                      <div
                        className="absolute w-full h-full rounded-full animate-pulse"
                        style={{
                          backgroundColor: config.color,
                          opacity: 0.2,
                        }}
                      ></div>
                      {/* Center Dot */}
                      <div
                        className="relative w-4 h-4 rounded-full border-2 border-[#0f0f1a]"
                        style={{ backgroundColor: config.color }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-8 max-w-xl mx-auto">
            <p className="text-[#8888a0] mb-4 text-sm">
              Do you have information about Brittany's disappearance?
            </p>
            <a
              href="tel:5165737347"
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-red-700 transition-colors mb-3"
            >
              Call Nassau County Police
            </a>
            <p className="text-[#666675] text-sm">
              516-573-7347 • Available 24/7
            </p>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="mt-12 text-center text-[#8888a0] text-sm max-w-2xl mx-auto">
          <p>
            This timeline represents key events in the investigation of
            Brittany Kritis-Garip's disappearance. Information is updated as
            the investigation progresses. If you have additional information
            about any of these events or other relevant details, please contact
            law enforcement immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
