"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// Dynamically import MapComponent to avoid SSR issues with Leaflet
const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-[#8888a0]">Loading investigation map...</p>
        </div>
      </div>
    ),
  }
);

export default function MapPage() {
  const [showLegend, setShowLegend] = useState(true);

  return (
    <div className="flex h-screen bg-[#0f0f1a]">
      {/* Map Container */}
      <div className="flex-1 relative">
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        />
        <MapComponent />

        {/* Legend Toggle Button */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="absolute top-4 left-4 z-40 bg-[#1c1c2e] border border-[#2a2a40] text-[#f0f0f5] px-3 py-2 rounded-md text-sm font-medium hover:bg-[#2a2a40] transition-colors"
        >
          {showLegend ? "Hide" : "Show"} Legend
        </button>
      </div>

      {/* Right Sidebar */}
      {showLegend && (
        <div className="w-80 bg-[#161625] border-l border-[#2a2a40] overflow-y-auto p-6">
          {/* Case Information */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-red-400 mb-3">Case Info</h2>
            <div className="bg-[#1c1c2e] rounded-lg p-4 text-sm text-[#d0d0dc]">
              <p className="font-semibold text-[#f0f0f5] mb-2">
                Brittany Kritis-Garip
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-[#8888a0]">Age:</span> 32
                </li>
                <li>
                  <span className="text-[#8888a0]">Missing:</span> March 20,
                  2026
                </li>
                <li>
                  <span className="text-[#8888a0]">Last Seen:</span> 8:14 PM,
                  McCouns Lane
                </li>
                <li>
                  <span className="text-[#8888a0]">Location:</span> Oyster Bay,
                  Long Island, NY
                </li>
                <li className="pt-2 border-t border-[#2a2a40]">
                  <span className="text-[#8888a0]">Height:</span> 5&apos;7&quot;
                </li>
                <li>
                  <span className="text-[#8888a0]">Weight:</span> 140 lbs
                </li>
                <li>
                  <span className="text-[#8888a0]">Hair:</span> Brown
                </li>
                <li>
                  <span className="text-[#8888a0]">Eyes:</span> Brown
                </li>
                <li className="pt-2 border-t border-[#2a2a40]">
                  <span className="text-[#8888a0]">Last Wearing:</span> Black
                  pants, black jacket with fur collar
                </li>
              </ul>
            </div>
          </div>

          {/* Map Legend */}
          <div className="mb-6">
            <h3 className="text-md font-bold text-[#f0f0f5] mb-3">Legend</h3>

            <div className="space-y-4 text-sm">
              {/* Location Markers */}
              <div>
                <h4 className="font-semibold text-[#d0d0dc] mb-2">
                  Investigation Locations
                </h4>
                <div className="space-y-2 text-xs text-[#a0a0b0]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                    <span>Last Seen Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                    <span>Missing Poster Address</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span>Transit Location</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span>Search Area / Point of Interest</span>
                  </div>
                </div>
              </div>

              {/* Search Radius */}
              <div>
                <h4 className="font-semibold text-[#d0d0dc] mb-2">
                  Search Radius
                </h4>
                <div className="space-y-2 text-xs text-[#a0a0b0]">
                  <p className="italic text-[#888899]">
                    Concentric circles centered on last seen location (McCouns
                    Lane, 8:14 PM)
                  </p>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-3 h-3 border-2 border-red-500 rounded-full"></div>
                    <span>0.25 miles (400m)</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-3 h-3 border-2 border-red-500 rounded-full opacity-75"></div>
                    <span>0.5 miles (800m)</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-3 h-3 border-2 border-red-500 rounded-full opacity-50"></div>
                    <span>1 mile (1600m)</span>
                  </div>
                </div>
              </div>

              {/* Map Layers */}
              <div>
                <h4 className="font-semibold text-[#d0d0dc] mb-2">
                  Map Layers
                </h4>
                <p className="text-xs text-[#a0a0b0] italic">
                  Use the layer control (top-right corner) to toggle base maps
                  and overlays.
                </p>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="mb-6">
            <h3 className="text-md font-bold text-[#f0f0f5] mb-3">Filters</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-[#d0d0dc] cursor-pointer hover:text-[#f0f0f5]">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[#2a2a40] bg-[#1c1c2e] text-red-500"
                />
                Sighting Reports
              </label>
              <label className="flex items-center gap-2 text-sm text-[#d0d0dc] cursor-pointer hover:text-[#f0f0f5]">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[#2a2a40] bg-[#1c1c2e] text-blue-500"
                />
                Key Locations
              </label>
              <label className="flex items-center gap-2 text-sm text-[#d0d0dc] cursor-pointer hover:text-[#f0f0f5]">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[#2a2a40] bg-[#1c1c2e] text-green-500"
                />
                Search Areas
              </label>
            </div>
          </div>

          {/* Information Card */}
          <div className="bg-[#1c1c2e] border border-[#2a2a40] rounded-lg p-4 text-xs text-[#a0a0b0]">
            <p className="font-semibold text-[#f0f0f5] mb-2">
              How to Use This Map
            </p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Click markers to see details about each location</li>
              <li>Use the layer control to switch map styles</li>
              <li>Zoom in/out to explore the area in detail</li>
              <li>Toggle overlays to show/hide specific information</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="mt-6 p-4 bg-red-600 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg text-center">
            <p className="text-sm font-semibold text-red-400 mb-2">
              Have Information?
            </p>
            <a
              href="tel:5165737347"
              className="inline-block bg-red-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Call Nassau PD
            </a>
            <p className="text-xs text-[#8888a0] mt-2">516-573-7347</p>
          </div>
        </div>
      )}
    </div>
  );
}
