"use client";

import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
  LayersControl,
  FeatureGroup,
} from "react-leaflet";

// Fix default marker icon issue with Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Sighting {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  color: string;
  timestamp?: string;
}

interface MapComponentProps {
  sightings?: Sighting[];
}

// Known investigation locations
const LOCATIONS = [
  {
    lat: 40.8728,
    lng: -73.534,
    title: "McCouns Lane",
    description: "Last Seen 8:14 PM",
    color: "red",
    radius: 5,
  },
  {
    lat: 40.8705,
    lng: -73.531,
    title: "Ivy Street",
    description: "Missing Poster Address",
    color: "yellow",
    radius: 5,
  },
  {
    lat: 40.866,
    lng: -73.533,
    title: "Oyster Bay LIRR Station",
    description: "LIRR Station",
    color: "blue",
    radius: 5,
  },
  {
    lat: 40.8645,
    lng: -73.529,
    title: "Mill Pond",
    description: "Mill Pond / Beekman Beach",
    color: "#2ecc71",
    radius: 5,
  },
  {
    lat: 40.868,
    lng: -73.537,
    title: "Theodore Roosevelt Park",
    description: "TR Memorial Park",
    color: "#2ecc71",
    radius: 5,
  },
  {
    lat: 40.863,
    lng: -73.536,
    title: "Oyster Bay Harbor",
    description: "Harbor",
    color: "#2ecc71",
    radius: 5,
  },
];

// Last seen location for search radius
const LAST_SEEN = { lat: 40.8728, lng: -73.534 };

// Convert miles to meters for Leaflet circles
const SEARCH_RADII = [
  { distance: 0.25, label: "0.25 mi (400m)", color: "rgba(255, 0, 0, 0.1)" },
  { distance: 0.5, label: "0.5 mi (800m)", color: "rgba(255, 100, 0, 0.08)" },
  { distance: 1, label: "1 mi (1600m)", color: "rgba(255, 165, 0, 0.06)" },
];

export default function MapComponent({ sightings = [] }: MapComponentProps) {
  // Merge known locations with any provided sightings
  const allMarkers = [
    ...LOCATIONS,
    ...sightings.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      title: s.title,
      description: s.description,
      color: s.color,
      radius: 5,
    })),
  ];

  return (
    <MapContainer
      center={[40.87, -73.532]}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <LayersControl position="topright">
        {/* Tile Layers */}
        <LayersControl.BaseLayer checked name="Dark Map">
          <TileLayer
            attribution='&copy; CartoDB contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Street View">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* Search Radius Layer */}
        <LayersControl.Overlay checked name="Search Radius">
          <FeatureGroup>
            {SEARCH_RADII.map((radius) => (
              <Circle
                key={radius.label}
                center={[LAST_SEEN.lat, LAST_SEEN.lng]}
                radius={radius.distance * 1609.34}
                pathOptions={{
                  color: "#ff6b6b",
                  fill: true,
                  fillColor: radius.color,
                  fillOpacity: 0.3,
                  weight: 2,
                  dashArray: "5, 5",
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} permanent>
                  {radius.label}
                </Tooltip>
              </Circle>
            ))}
          </FeatureGroup>
        </LayersControl.Overlay>

        {/* Sightings Layer */}
        <LayersControl.Overlay checked name="Investigation Locations">
          <FeatureGroup>
            {allMarkers.map((marker) => (
              <CircleMarker
                key={`${marker.lat}-${marker.lng}-${marker.title}`}
                center={[marker.lat, marker.lng]}
                radius={marker.radius}
                pathOptions={{
                  color: marker.color,
                  fill: true,
                  fillColor: marker.color,
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{marker.title}</p>
                    <p className="text-[#555]">{marker.description}</p>
                    <p className="text-[#777] text-xs mt-1">
                      {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -10]}>
                  {marker.title}
                </Tooltip>
              </CircleMarker>
            ))}
          </FeatureGroup>
        </LayersControl.Overlay>
      </LayersControl>
    </MapContainer>
  );
}
