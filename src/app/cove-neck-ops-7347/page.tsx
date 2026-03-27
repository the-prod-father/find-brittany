"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import AddressSearch from "@/components/AddressSearch";

// ============================================
// TYPES & CONSTANTS
// ============================================

interface PropertyChecklist {
  main_house: boolean;
  garage: boolean;
  guest_house: boolean;
  shed: boolean;
  boathouse: boolean;
  grounds: boolean;
  signs_entry: boolean;
  footprints: boolean;
  water_sources: boolean;
  cameras_identified: boolean;
  footage_requested: boolean;
  spoke_occupant: boolean;
  appears_vacant: boolean;
}

interface PropertyData {
  checklist: Partial<PropertyChecklist>;
  notes: string;
  property_type: string;
  structures: string[];
  checked_by: string;
}

interface CanvassProperty {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  contacted_by: string | null;
  contacted_at: string | null;
  has_camera: boolean | null;
  footage_obtained: boolean;
  footage_notes: string | null;
  priority: string;
}

const CHECKLIST_ITEMS: { key: keyof PropertyChecklist; label: string; category: string }[] = [
  { key: "main_house", label: "Main house checked (doors & windows)", category: "Structures" },
  { key: "garage", label: "Garage / carport checked", category: "Structures" },
  { key: "guest_house", label: "Guest house / pool house / cabana", category: "Structures" },
  { key: "shed", label: "Shed / outbuilding checked", category: "Structures" },
  { key: "boathouse", label: "Boathouse / dock area", category: "Structures" },
  { key: "grounds", label: "Grounds & yard walked", category: "Grounds" },
  { key: "signs_entry", label: "Signs of forced entry?", category: "Indicators" },
  { key: "footprints", label: "Footprints in mud / soft ground?", category: "Indicators" },
  { key: "water_sources", label: "Outdoor water sources checked (spigots, hoses, rain barrels)", category: "Indicators" },
  { key: "cameras_identified", label: "Security cameras identified", category: "Cameras" },
  { key: "footage_requested", label: "Camera footage requested / obtained", category: "Cameras" },
  { key: "spoke_occupant", label: "Spoke with occupant or caretaker", category: "Contact" },
  { key: "appears_vacant", label: "Property appears vacant / seasonal", category: "Contact" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string }> = {
  not_checked: { label: "Not Checked", color: "#ef4444", bg: "bg-red-50 text-red-700 border-red-200", ring: "ring-red-400" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "bg-amber-50 text-amber-700 border-amber-200", ring: "ring-amber-400" },
  cleared: { label: "Cleared", color: "#22c55e", bg: "bg-green-50 text-green-700 border-green-200", ring: "ring-green-400" },
  needs_followup: { label: "Needs Follow-up", color: "#8b5cf6", bg: "bg-purple-50 text-purple-700 border-purple-200", ring: "ring-purple-400" },
  has_camera: { label: "Has Camera", color: "#3b82f6", bg: "bg-blue-50 text-blue-700 border-blue-200", ring: "ring-blue-400" },
  person_of_interest: { label: "Alert", color: "#ef4444", bg: "bg-red-100 text-red-800 border-red-300", ring: "ring-red-500" },
};

// Cove Neck polygon (approximate boundary)
const COVE_NECK_POLYGON = [
  { lat: 40.8808, lng: -73.5068 },
  { lat: 40.8805, lng: -73.4988 },
  { lat: 40.8820, lng: -73.4955 },
  { lat: 40.8850, lng: -73.4930 },
  { lat: 40.8880, lng: -73.4915 },
  { lat: 40.8910, lng: -73.4920 },
  { lat: 40.8935, lng: -73.4940 },
  { lat: 40.8940, lng: -73.4965 },
  { lat: 40.8925, lng: -73.5000 },
  { lat: 40.8900, lng: -73.5020 },
  { lat: 40.8870, lng: -73.5040 },
  { lat: 40.8840, lng: -73.5055 },
  { lat: 40.8820, lng: -73.5065 },
];

const COVE_NECK_CENTER = { lat: 40.886, lng: -73.499 };

// Real addresses from OpenStreetMap — 121 properties in Cove Neck area
const SEED_PROPERTIES = [
  // Cove Neck Road (78 properties)
  { address: "1 Cove Neck Road, Oyster Bay, NY", latitude: 40.8714356, longitude: -73.5061536, priority: "high" },
  { address: "2 Cove Neck Road, Oyster Bay, NY", latitude: 40.8709727, longitude: -73.5045823, priority: "high" },
  { address: "3 Cove Neck Road, Oyster Bay, NY", latitude: 40.8718626, longitude: -73.503591, priority: "high" },
  { address: "4 Cove Neck Road, Oyster Bay, NY", latitude: 40.8719676, longitude: -73.5047931, priority: "high" },
  { address: "6 Cove Neck Road, Oyster Bay, NY", latitude: 40.871982, longitude: -73.5018765, priority: "high" },
  { address: "14 Cove Neck Road, Oyster Bay, NY", latitude: 40.8743652, longitude: -73.5012222, priority: "high" },
  { address: "16 Cove Neck Road, Oyster Bay, NY", latitude: 40.8735691, longitude: -73.5007036, priority: "high" },
  { address: "20 Cove Neck Road, Oyster Bay, NY", latitude: 40.8751318, longitude: -73.5017452, priority: "high" },
  { address: "22 Cove Neck Road, Oyster Bay, NY", latitude: 40.8753829, longitude: -73.5018812, priority: "high" },
  { address: "24 Cove Neck Road, Oyster Bay, NY", latitude: 40.8755833, longitude: -73.5019205, priority: "high" },
  { address: "26 Cove Neck Road, Oyster Bay, NY", latitude: 40.8775296, longitude: -73.4991811, priority: "high" },
  { address: "30 Cove Neck Road, Oyster Bay, NY", latitude: 40.8764501, longitude: -73.5025231, priority: "high" },
  { address: "40 Cove Neck Road, Oyster Bay, NY", latitude: 40.8772457, longitude: -73.5032295, priority: "high" },
  { address: "45 Cove Neck Road, Oyster Bay, NY", latitude: 40.8818336, longitude: -73.5073771, priority: "high" },
  { address: "49 Cove Neck Road, Oyster Bay, NY", latitude: 40.8840113, longitude: -73.5078117, priority: "high" },
  { address: "53 Cove Neck Road, Oyster Bay, NY", latitude: 40.8851211, longitude: -73.5072656, priority: "high" },
  { address: "55 Cove Neck Road, Oyster Bay, NY", latitude: 40.8852786, longitude: -73.5085246, priority: "high" },
  { address: "59 Cove Neck Road, Oyster Bay, NY", latitude: 40.8862191, longitude: -73.5066741, priority: "high" },
  { address: "61 Cove Neck Road, Oyster Bay, NY", latitude: 40.8872971, longitude: -73.5099548, priority: "high" },
  { address: "62 Cove Neck Road, Oyster Bay, NY", latitude: 40.8841621, longitude: -73.5056371, priority: "high" },
  { address: "63 Cove Neck Road, Oyster Bay, NY", latitude: 40.8874821, longitude: -73.5103756, priority: "high" },
  { address: "64 Cove Neck Road, Oyster Bay, NY", latitude: 40.8849886, longitude: -73.5058736, priority: "high" },
  { address: "65 Cove Neck Road, Oyster Bay, NY", latitude: 40.8865275, longitude: -73.5090771, priority: "high" },
  { address: "66 Cove Neck Road, Oyster Bay, NY", latitude: 40.8853211, longitude: -73.5040611, priority: "high" },
  { address: "67 Cove Neck Road, Oyster Bay, NY", latitude: 40.8893634, longitude: -73.5089733, priority: "high" },
  { address: "68 Cove Neck Road, Oyster Bay, NY", latitude: 40.8858576, longitude: -73.5043481, priority: "high" },
  { address: "70 Cove Neck Road, Oyster Bay, NY", latitude: 40.8860215, longitude: -73.5057011, priority: "high" },
  { address: "72 Cove Neck Road, Oyster Bay, NY", latitude: 40.8865416, longitude: -73.5056616, priority: "high" },
  { address: "73 Cove Neck Road, Oyster Bay, NY", latitude: 40.8884196, longitude: -73.5078556, priority: "high" },
  { address: "75 Cove Neck Road, Oyster Bay, NY", latitude: 40.8897989, longitude: -73.5085863, priority: "high" },
  { address: "76 Cove Neck Road, Oyster Bay, NY", latitude: 40.8863616, longitude: -73.5036861, priority: "high" },
  { address: "77 Cove Neck Road, Oyster Bay, NY", latitude: 40.8889171, longitude: -73.5073941, priority: "high" },
  { address: "78 Cove Neck Road, Oyster Bay, NY", latitude: 40.8873126, longitude: -73.5046536, priority: "high" },
  { address: "79 Cove Neck Road, Oyster Bay, NY", latitude: 40.8895267, longitude: -73.5078934, priority: "high" },
  { address: "80 Cove Neck Road, Oyster Bay, NY", latitude: 40.8871881, longitude: -73.5056161, priority: "high" },
  { address: "81 Cove Neck Road, Oyster Bay, NY", latitude: 40.8900971, longitude: -73.508084, priority: "high" },
  { address: "82 Cove Neck Road, Oyster Bay, NY", latitude: 40.8870991, longitude: -73.5053911, priority: "high" },
  { address: "83 Cove Neck Road, Oyster Bay, NY", latitude: 40.8903299, longitude: -73.5075315, priority: "high" },
  { address: "84 Cove Neck Road, Oyster Bay, NY", latitude: 40.8880688, longitude: -73.5055028, priority: "high" },
  { address: "85 Cove Neck Road, Oyster Bay, NY", latitude: 40.8888496, longitude: -73.5062301, priority: "high" },
  { address: "86 Cove Neck Road, Oyster Bay, NY", latitude: 40.8882961, longitude: -73.5038961, priority: "high" },
  { address: "87 Cove Neck Road, Oyster Bay, NY", latitude: 40.8899011, longitude: -73.5064986, priority: "high" },
  { address: "89 Cove Neck Road, Oyster Bay, NY", latitude: 40.8900497, longitude: -73.5060298, priority: "high" },
  { address: "91 Cove Neck Road, Oyster Bay, NY", latitude: 40.8930631, longitude: -73.507951, priority: "high" },
  { address: "93 Cove Neck Road, Oyster Bay, NY", latitude: 40.8915098, longitude: -73.505606, priority: "high" },
  { address: "95 Cove Neck Road, Oyster Bay, NY", latitude: 40.8923617, longitude: -73.5056632, priority: "high" },
  { address: "99 Cove Neck Road, Oyster Bay, NY", latitude: 40.8931906, longitude: -73.5060846, priority: "high" },
  { address: "100 Cove Neck Road, Oyster Bay, NY", latitude: 40.8900653, longitude: -73.5049792, priority: "high" },
  { address: "101 Cove Neck Road, Oyster Bay, NY", latitude: 40.8926066, longitude: -73.5047126, priority: "high" },
  { address: "105 Cove Neck Road, Oyster Bay, NY", latitude: 40.8910588, longitude: -73.5044795, priority: "high" },
  { address: "107 Cove Neck Road, Oyster Bay, NY", latitude: 40.8912873, longitude: -73.504466, priority: "high" },
  { address: "109 Cove Neck Road, Oyster Bay, NY", latitude: 40.8909681, longitude: -73.5034691, priority: "high" },
  { address: "111 Cove Neck Road, Oyster Bay, NY", latitude: 40.8916771, longitude: -73.5028946, priority: "high" },
  { address: "113 Cove Neck Road, Oyster Bay, NY", latitude: 40.8938665, longitude: -73.5046171, priority: "high" },
  { address: "115 Cove Neck Road, Oyster Bay, NY", latitude: 40.8925656, longitude: -73.5037151, priority: "high" },
  { address: "117 Cove Neck Road, Oyster Bay, NY", latitude: 40.8920881, longitude: -73.5018106, priority: "high" },
  { address: "119 Cove Neck Road, Oyster Bay, NY", latitude: 40.8936626, longitude: -73.5031391, priority: "high" },
  { address: "123 Cove Neck Road, Oyster Bay, NY", latitude: 40.8929271, longitude: -73.5010855, priority: "high" },
  { address: "125 Cove Neck Road, Oyster Bay, NY", latitude: 40.8938596, longitude: -73.5015106, priority: "high" },
  { address: "129 Cove Neck Road, Oyster Bay, NY", latitude: 40.8904351, longitude: -73.5028926, priority: "high" },
  { address: "133 Cove Neck Road, Oyster Bay, NY", latitude: 40.8925874, longitude: -73.5007047, priority: "high" },
  { address: "134 Cove Neck Road, Oyster Bay, NY", latitude: 40.8895371, longitude: -73.5036788, priority: "high" },
  { address: "135 Cove Neck Road, Oyster Bay, NY", latitude: 40.8941521, longitude: -73.4997971, priority: "high" },
  { address: "136 Cove Neck Road, Oyster Bay, NY", latitude: 40.8892421, longitude: -73.5025786, priority: "high" },
  { address: "137 Cove Neck Road, Oyster Bay, NY", latitude: 40.8935141, longitude: -73.4985351, priority: "high" },
  { address: "140 Cove Neck Road, Oyster Bay, NY", latitude: 40.8893241, longitude: -73.5014201, priority: "high" },
  { address: "145 Cove Neck Road, Oyster Bay, NY", latitude: 40.8908054, longitude: -73.499929, priority: "high" },
  { address: "147 Cove Neck Road, Oyster Bay, NY", latitude: 40.8901911, longitude: -73.4991956, priority: "high" },
  { address: "149 Cove Neck Road, Oyster Bay, NY", latitude: 40.8915856, longitude: -73.4990226, priority: "high" },
  { address: "153 Cove Neck Road, Oyster Bay, NY", latitude: 40.8916676, longitude: -73.4976256, priority: "high" },
  { address: "154 Cove Neck Road, Oyster Bay, NY", latitude: 40.8919216, longitude: -73.4959706, priority: "high" },
  { address: "156 Cove Neck Road, Oyster Bay, NY", latitude: 40.8924065, longitude: -73.4935357, priority: "high" },
  { address: "158 Cove Neck Road, Oyster Bay, NY", latitude: 40.8931561, longitude: -73.4951776, priority: "high" },
  { address: "159 Cove Neck Road, Oyster Bay, NY", latitude: 40.8943173, longitude: -73.4970402, priority: "high" },
  { address: "161 Cove Neck Road, Oyster Bay, NY", latitude: 40.8943411, longitude: -73.4951576, priority: "high" },
  { address: "164 Cove Neck Road, Oyster Bay, NY", latitude: 40.8908781, longitude: -73.4962191, priority: "high" },
  // Sagamore Hill Road (NPS + residential)
  { address: "1 Sagamore Hill Road, Oyster Bay, NY", latitude: 40.8835046, longitude: -73.5054386, priority: "high" },
  { address: "2 Sagamore Hill Road, Oyster Bay, NY", latitude: 40.8820501, longitude: -73.5044456, priority: "high" },
  { address: "3 Sagamore Hill Road, Oyster Bay, NY", latitude: 40.8848296, longitude: -73.5035836, priority: "high" },
  { address: "6 Sagamore Hill Road, Oyster Bay, NY", latitude: 40.883364, longitude: -73.5028199, priority: "high" },
  { address: "8 Sagamore Hill Road, Oyster Bay, NY", latitude: 40.8834991, longitude: -73.5014256, priority: "high" },
  { address: "10 Sagamore Hill Road — Sagamore Hill NHS", latitude: 40.8855768, longitude: -73.5010727, priority: "critical" },
  { address: "20 Sagamore Hill Road — Old Orchard Museum", latitude: 40.8859133, longitude: -73.495962, priority: "critical" },
  { address: "5 Sagamore Hill Road, Oyster Bay, NY", latitude: 40.8885201, longitude: -73.4934946, priority: "high" },
  { address: "146 Sagamore Hill Road, Oyster Bay, NY", latitude: 40.8888576, longitude: -73.4999536, priority: "high" },
  // Tennis Court Road
  { address: "2 Tennis Court Road, Oyster Bay, NY", latitude: 40.8788191, longitude: -73.5039151, priority: "medium" },
  { address: "4 Tennis Court Road, Oyster Bay, NY", latitude: 40.8799856, longitude: -73.5020066, priority: "medium" },
  { address: "5 Tennis Court Road, Oyster Bay, NY", latitude: 40.8801791, longitude: -73.5002201, priority: "medium" },
  { address: "7 Tennis Court Road, Oyster Bay, NY", latitude: 40.8825441, longitude: -73.4978151, priority: "medium" },
  { address: "8 Tennis Court Road, Oyster Bay, NY", latitude: 40.8789856, longitude: -73.4979401, priority: "medium" },
  { address: "10 Tennis Court Road, Oyster Bay, NY", latitude: 40.8801156, longitude: -73.4979766, priority: "medium" },
  { address: "12 Tennis Court Road, Oyster Bay, NY", latitude: 40.8800636, longitude: -73.4972306, priority: "medium" },
  { address: "14 Tennis Court Road, Oyster Bay, NY", latitude: 40.8797966, longitude: -73.4965156, priority: "medium" },
  { address: "15 Tennis Court Road, Oyster Bay, NY", latitude: 40.8808406, longitude: -73.4982951, priority: "medium" },
  { address: "16 Tennis Court Road, Oyster Bay, NY", latitude: 40.8797251, longitude: -73.4955906, priority: "medium" },
  { address: "17 Tennis Court Road, Oyster Bay, NY", latitude: 40.8815861, longitude: -73.4970711, priority: "medium" },
  { address: "18 Tennis Court Road, Oyster Bay, NY", latitude: 40.8802436, longitude: -73.4936226, priority: "medium" },
  { address: "20 Tennis Court Road, Oyster Bay, NY", latitude: 40.8806381, longitude: -73.4916741, priority: "medium" },
  { address: "21 Tennis Court Road, Oyster Bay, NY", latitude: 40.8807624, longitude: -73.4966824, priority: "medium" },
  { address: "22 Tennis Court Road, Oyster Bay, NY", latitude: 40.8811686, longitude: -73.4911416, priority: "medium" },
  { address: "23 Tennis Court Road, Oyster Bay, NY", latitude: 40.8815921, longitude: -73.4958916, priority: "medium" },
  { address: "24 Tennis Court Road, Oyster Bay, NY", latitude: 40.8815801, longitude: -73.4916991, priority: "medium" },
  { address: "25 Tennis Court Road, Oyster Bay, NY", latitude: 40.8808726, longitude: -73.4957401, priority: "medium" },
  { address: "26 Tennis Court Road, Oyster Bay, NY", latitude: 40.8822841, longitude: -73.4919836, priority: "medium" },
  { address: "27 Tennis Court Road, Oyster Bay, NY", latitude: 40.8805191, longitude: -73.4944616, priority: "medium" },
  { address: "28 Tennis Court Road, Oyster Bay, NY", latitude: 40.8828361, longitude: -73.4919816, priority: "medium" },
  { address: "29 Tennis Court Road, Oyster Bay, NY", latitude: 40.8809011, longitude: -73.4950231, priority: "medium" },
  { address: "30 Tennis Court Road, Oyster Bay, NY", latitude: 40.8813686, longitude: -73.4928401, priority: "medium" },
  { address: "31 Tennis Court Road, Oyster Bay, NY", latitude: 40.8817336, longitude: -73.4940761, priority: "medium" },
  { address: "32 Tennis Court Road, Oyster Bay, NY", latitude: 40.8819521, longitude: -73.4927816, priority: "medium" },
  { address: "33 Tennis Court Road, Oyster Bay, NY", latitude: 40.8817756, longitude: -73.4953006, priority: "medium" },
  { address: "35 Tennis Court Road, Oyster Bay, NY", latitude: 40.8822136, longitude: -73.4940871, priority: "medium" },
  // Other side streets
  { address: "1 Gracewood Court, Oyster Bay, NY", latitude: 40.8811501, longitude: -73.5038021, priority: "medium" },
  { address: "2 Gracewood Court, Oyster Bay, NY", latitude: 40.8798901, longitude: -73.5032646, priority: "medium" },
  { address: "3 Gracewood Court, Oyster Bay, NY", latitude: 40.8818561, longitude: -73.5029086, priority: "medium" },
  { address: "5 Gracewood Court, Oyster Bay, NY", latitude: 40.8821716, longitude: -73.5024716, priority: "medium" },
  { address: "7 Gracewood Court, Oyster Bay, NY", latitude: 40.8824196, longitude: -73.5021786, priority: "medium" },
  { address: "9 Gracewood Court, Oyster Bay, NY", latitude: 40.8813536, longitude: -73.5017891, priority: "medium" },
  { address: "2 Elfland Court, Oyster Bay, NY", latitude: 40.8819011, longitude: -73.4990466, priority: "medium" },
  { address: "5 Elfland Court, Oyster Bay, NY", latitude: 40.8821506, longitude: -73.5011581, priority: "medium" },
  { address: "6 Elfland Court, Oyster Bay, NY", latitude: 40.8840126, longitude: -73.4989016, priority: "medium" },
  { address: "8 Elfland Court, Oyster Bay, NY", latitude: 40.8839051, longitude: -73.5003956, priority: "medium" },
  { address: "10 Elfland Court, Oyster Bay, NY", latitude: 40.8825111, longitude: -73.4990996, priority: "medium" },
  { address: "16 Elfland Court, Oyster Bay, NY", latitude: 40.8816826, longitude: -73.5001581, priority: "medium" },
  { address: "9 Valley Road, Oyster Bay, NY", latitude: 40.8839076, longitude: -73.4939601, priority: "medium" },
  { address: "11 Valley Road, Oyster Bay, NY", latitude: 40.8841304, longitude: -73.4925856, priority: "medium" },
  { address: "139 Coopers Bluff Lane, Oyster Bay, NY", latitude: 40.8933321, longitude: -73.4979081, priority: "medium" },
  { address: "151 Coopers Bluff Lane, Oyster Bay, NY", latitude: 40.8906231, longitude: -73.4981341, priority: "medium" },
].map(p => ({ ...p, notes: JSON.stringify({ checklist: {}, notes: "", property_type: "residential", structures: [], checked_by: "" }) }));

// ============================================
// HELPERS
// ============================================

function parsePropertyData(notes: string | null): PropertyData {
  if (!notes) return { checklist: {}, notes: "", property_type: "residential", structures: [], checked_by: "" };
  try {
    const parsed = JSON.parse(notes);
    return {
      checklist: parsed.checklist || {},
      notes: parsed.notes || "",
      property_type: parsed.property_type || "residential",
      structures: parsed.structures || [],
      checked_by: parsed.checked_by || "",
    };
  } catch {
    return { checklist: {}, notes: notes, property_type: "residential", structures: [], checked_by: "" };
  }
}

function serializePropertyData(data: PropertyData): string {
  return JSON.stringify(data);
}

function getChecklistProgress(checklist: Partial<PropertyChecklist>): { done: number; total: number } {
  const total = CHECKLIST_ITEMS.length;
  const done = Object.values(checklist).filter(Boolean).length;
  return { done, total };
}

function getPropertyStatus(prop: CanvassProperty): string {
  const data = parsePropertyData(prop.notes);
  const { done, total } = getChecklistProgress(data.checklist);
  if (prop.status === "person_of_interest") return "person_of_interest";
  if (prop.status === "needs_followup") return "needs_followup";
  if (prop.status === "has_camera" || prop.has_camera) return "has_camera";
  if (done === total && done > 0) return "cleared";
  if (done > 0) return "in_progress";
  return "not_checked";
}

// ============================================
// MAP COMPONENT
// ============================================

function CoveNeckMapContent({
  properties,
  selectedId,
  onSelectProperty,
  zoomTo,
}: {
  properties: CanvassProperty[];
  selectedId: string | null;
  onSelectProperty: (id: string) => void;
  zoomTo: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    // Draw Cove Neck polygon
    if (!polygonRef.current) {
      polygonRef.current = new google.maps.Polygon({
        paths: COVE_NECK_POLYGON,
        strokeColor: "#ef4444",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#ef4444",
        fillOpacity: 0.08,
        map,
      });
    }

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
    };
  }, [map]);

  // Zoom to selected property
  useEffect(() => {
    if (!map || !zoomTo) return;
    map.panTo(zoomTo);
    map.setZoom(19);
  }, [map, zoomTo]);

  return (
    <>
      {properties.map((prop) => {
        if (!prop.latitude || !prop.longitude) return null;
        const status = getPropertyStatus(prop);
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_checked;
        const isSelected = prop.id === selectedId;
        return (
          <AdvancedMarker
            key={prop.id}
            position={{ lat: prop.latitude, lng: prop.longitude }}
            onClick={() => onSelectProperty(prop.id)}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer transition-transform ${isSelected ? "scale-150 ring-2 " + config.ring : ""}`}
              style={{ backgroundColor: config.color }}
              title={prop.address}
            />
          </AdvancedMarker>
        );
      })}
    </>
  );
}

// ============================================
// PROPERTY CARD
// ============================================

function PropertyCard({
  property,
  isExpanded,
  onToggle,
  onUpdate,
}: {
  property: CanvassProperty;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<CanvassProperty>) => void;
}) {
  const data = parsePropertyData(property.notes);
  const progress = getChecklistProgress(data.checklist);
  const status = getPropertyStatus(property);
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_checked;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [localNotes, setLocalNotes] = useState(data.notes);
  const [checkedBy, setCheckedBy] = useState(data.checked_by);
  const [structures, setStructures] = useState(data.structures.join(", "));
  const notesTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateChecklist = (key: keyof PropertyChecklist, value: boolean) => {
    const newData: PropertyData = {
      ...data,
      checklist: { ...data.checklist, [key]: value },
      notes: localNotes,
      checked_by: checkedBy,
      structures: structures.split(",").map(s => s.trim()).filter(Boolean),
    };
    const newProgress = getChecklistProgress(newData.checklist);
    const newStatus = newProgress.done === newProgress.total && newProgress.done > 0 ? "cleared" : newProgress.done > 0 ? "in_progress" : "not_checked";
    onUpdate(property.id, {
      notes: serializePropertyData(newData),
      status: property.status === "needs_followup" || property.status === "person_of_interest" ? property.status : newStatus,
      contacted_by: checkedBy || property.contacted_by,
      contacted_at: new Date().toISOString(),
    });
  };

  const saveNotes = (text: string) => {
    setLocalNotes(text);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => {
      const newData: PropertyData = {
        ...data,
        checklist: data.checklist,
        notes: text,
        checked_by: checkedBy,
        structures: structures.split(",").map(s => s.trim()).filter(Boolean),
      };
      onUpdate(property.id, { notes: serializePropertyData(newData) });
    }, 1000);
  };

  const saveCheckedBy = (name: string) => {
    setCheckedBy(name);
    const newData: PropertyData = { ...data, notes: localNotes, checked_by: name };
    onUpdate(property.id, {
      notes: serializePropertyData(newData),
      contacted_by: name,
      contacted_at: new Date().toISOString(),
    });
  };

  const markStatus = (newStatus: string) => {
    onUpdate(property.id, { status: newStatus });
  };

  const hasSatellite = property.latitude && property.longitude && apiKey;
  const satelliteUrl = hasSatellite
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${property.latitude},${property.longitude}&zoom=19&size=600x300&maptype=satellite&scale=2&key=${apiKey}`
    : null;
  const earthUrl = property.latitude && property.longitude
    ? `https://earth.google.com/web/@${property.latitude},${property.longitude},0a,300d,35y,0h,45t,0r`
    : null;
  const streetViewUrl = property.latitude && property.longitude
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${property.latitude},${property.longitude}`
    : null;
  const mapsUrl = property.latitude && property.longitude
    ? `https://www.google.com/maps/@${property.latitude},${property.longitude},19z/data=!3m1!1e3`
    : null;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isExpanded ? "border-gray-300 shadow-lg" : "border-gray-200 shadow-sm"}`}>
      {/* Header - always visible */}
      <button onClick={onToggle} className="w-full text-left p-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900 leading-tight truncate">{property.address}</div>
            {data.property_type !== "residential" && (
              <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {data.property_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {progress.done > 0 && (
              <span className="text-[10px] text-gray-500 font-mono">{progress.done}/{progress.total}</span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${statusConfig.bg}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
        {data.checked_by && (
          <div className="text-[10px] text-gray-400 mt-1">
            Checked by {data.checked_by} {property.contacted_at ? `at ${new Date(property.contacted_at).toLocaleTimeString()}` : ""}
          </div>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Satellite Image */}
          {satelliteUrl && (
            <div className="relative">
              <img
                src={satelliteUrl}
                alt={`Satellite view of ${property.address}`}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                {earthUrl && (
                  <a href={earthUrl} target="_blank" rel="noopener noreferrer"
                    className="bg-black/70 text-white text-[10px] px-2 py-1 rounded hover:bg-black/90 transition-colors">
                    3D Earth
                  </a>
                )}
                {streetViewUrl && (
                  <a href={streetViewUrl} target="_blank" rel="noopener noreferrer"
                    className="bg-black/70 text-white text-[10px] px-2 py-1 rounded hover:bg-black/90 transition-colors">
                    Street View
                  </a>
                )}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="bg-black/70 text-white text-[10px] px-2 py-1 rounded hover:bg-black/90 transition-colors">
                    Google Maps
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="p-3 space-y-3">
            {/* Structures observed from satellite */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Structures on property (from satellite review)
              </label>
              <input
                type="text"
                value={structures}
                onChange={(e) => setStructures(e.target.value)}
                onBlur={() => {
                  const newData: PropertyData = { ...data, notes: localNotes, checked_by: checkedBy, structures: structures.split(",").map(s => s.trim()).filter(Boolean) };
                  onUpdate(property.id, { notes: serializePropertyData(newData) });
                }}
                placeholder="e.g. main house, pool house, 3-car garage, shed, tennis court"
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
              />
            </div>

            {/* Search Checklist */}
            <div>
              <div className="text-[11px] font-semibold text-gray-700 mb-2">
                Search Checklist ({progress.done}/{progress.total})
              </div>
              <div className="space-y-1">
                {CHECKLIST_ITEMS.map((item) => (
                  <label key={item.key} className="flex items-start gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!data.checklist[item.key]}
                      onChange={(e) => updateChecklist(item.key, e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-xs ${data.checklist[item.key] ? "text-gray-400 line-through" : "text-gray-700"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Field Notes</label>
              <textarea
                value={localNotes}
                onChange={(e) => saveNotes(e.target.value)}
                placeholder="Signs of entry, observations, follow-up needed..."
                rows={3}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400 resize-none"
              />
            </div>

            {/* Checked by */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">Checked by</label>
              <input
                type="text"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                onBlur={() => saveCheckedBy(checkedBy)}
                placeholder="Your name"
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder:text-gray-400"
              />
            </div>

            {/* Quick status buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button onClick={() => markStatus("cleared")} className="text-[10px] px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium">
                Mark Cleared
              </button>
              <button onClick={() => markStatus("needs_followup")} className="text-[10px] px-2.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 font-medium">
                Needs Follow-up
              </button>
              <button onClick={() => markStatus("has_camera")} className="text-[10px] px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 font-medium">
                Has Camera
              </button>
              <button onClick={() => markStatus("person_of_interest")} className="text-[10px] px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium">
                ALERT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// FIELD REFERENCE GUIDE
// ============================================

function FieldGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Field Reference Guide</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">X</button>
        </div>
        <div className="p-4 space-y-4 text-xs text-gray-700">
          <section>
            <h3 className="font-bold text-sm text-red-700 mb-1">CRITICAL: Behavioral Considerations</h3>
            <ul className="space-y-1 list-disc pl-4">
              <li>Person in psychosis may <strong>actively hide</strong> from searchers and flee</li>
              <li>Will likely NOT respond to her name being called</li>
              <li><strong>Search quietly</strong> — calm two-person teams, no shouting</li>
              <li>If found: one calm voice, don&apos;t crowd, offer water, call 911 + EMS immediately</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-sm text-gray-900 mb-1">What to Look For at Each Property</h3>
            <ul className="space-y-1 list-disc pl-4">
              <li><strong>Doors & windows:</strong> Any unlocked, ajar, or showing signs of forced entry?</li>
              <li><strong>Dust patterns:</strong> Disturbed dust on windowsills, door handles, floors</li>
              <li><strong>Footprints:</strong> In mud, soft ground, snow, or dew on grass</li>
              <li><strong>Missing food/water:</strong> Check outdoor fridges, pet food, bird feeders</li>
              <li><strong>Water source usage:</strong> Garden hoses uncoiled, spigots wet, rain barrel disturbed</li>
              <li><strong>Displaced items:</strong> Outdoor furniture moved, cushions rearranged, trash disturbed</li>
              <li><strong>Clothing or belongings:</strong> Any items that don&apos;t belong</li>
              <li><strong>Body warmth:</strong> Touch surfaces in enclosed spaces (car hoods, chair seats)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-sm text-gray-900 mb-1">Structures to Check</h3>
            <ul className="space-y-1 list-disc pl-4">
              <li>Main house (all entry points)</li>
              <li>Attached/detached garage</li>
              <li>Guest cottage, pool house, cabana</li>
              <li>Garden shed, tool shed, potting shed</li>
              <li>Boathouse, dock house, waterfront structures</li>
              <li>Under decks, porches, overhangs</li>
              <li>Vehicles (unlocked cars, boats under tarps)</li>
              <li>Crawl spaces accessible from outside</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-sm text-gray-900 mb-1">Camera Requests</h3>
            <ul className="space-y-1 list-disc pl-4">
              <li>Ask for footage from <strong>March 20 onward</strong> (night of disappearance)</li>
              <li>Ring, Nest, Arlo, Blink, Wyze — check all doorbell and outdoor cameras</li>
              <li>Ask about motion alert history for March 20-21 overnight</li>
              <li>Trail cameras on property (common in wooded areas)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-sm text-amber-700 mb-1">Subject Description</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div><strong>Brittany Kritis-Garip</strong>, 32</div>
              <div>5&apos;7&quot;, 140 lbs, brown hair, brown eyes</div>
              <div>Last wearing: black pants, black jacket with fur collar</div>
              <div className="mt-1 text-amber-700">May appear disoriented, confused, or frightened. Not dangerous.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

type FilterStatus = "all" | "not_checked" | "in_progress" | "cleared" | "needs_followup" | "has_camera" | "person_of_interest";

export default function CoveNeckOps() {
  const [properties, setProperties] = useState<CanvassProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [addingProperty, setAddingProperty] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [seeding, setSeeding] = useState(false);
  const lastFetch = useRef<number>(0);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const fetchProperties = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/canvass");
      const data = await res.json();
      setProperties(data.locations || []);
      lastFetch.current = Date.now();
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Poll every 30s for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProperties(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchProperties]);

  const updateProperty = useCallback(async (id: string, updates: Partial<CanvassProperty>) => {
    // Optimistic update
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

    const res = await fetch("/api/canvass", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) {
      // Revert on failure
      fetchProperties(true);
    }
  }, [fetchProperties]);

  const addProperty = useCallback(async ({ address, lat, lng }: { address: string; lat: number; lng: number }) => {
    const newData: PropertyData = { checklist: {}, notes: "", property_type: "residential", structures: [], checked_by: "" };
    const res = await fetch("/api/canvass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, latitude: lat, longitude: lng, notes: serializePropertyData(newData), priority: "high" }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setProperties((prev) => [...prev, {
        id, address, latitude: lat, longitude: lng, status: "not_checked",
        notes: serializePropertyData(newData), contacted_by: null, contacted_at: null,
        has_camera: null, footage_obtained: false, footage_notes: null, priority: "high",
      }]);
      setAddingProperty(false);
    }
  }, []);

  const seedProperties = useCallback(async () => {
    if (properties.length > 0) {
      if (!window.confirm(`There are already ${properties.length} properties. Seed ${SEED_PROPERTIES.length} Cove Neck locations?`)) return;
    }
    setSeeding(true);
    for (const prop of SEED_PROPERTIES) {
      await fetch("/api/canvass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prop),
      });
    }
    await fetchProperties();
    setSeeding(false);
  }, [properties.length, fetchProperties]);

  const filteredProperties = properties.filter((p) => {
    if (filter === "all") return true;
    return getPropertyStatus(p) === filter;
  });

  // Sort: critical first, then by status (not_checked > in_progress > rest)
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder: Record<string, number> = { person_of_interest: 0, not_checked: 1, needs_followup: 2, in_progress: 3, has_camera: 4, cleared: 5 };
    const aPri = priorityOrder[a.priority] ?? 2;
    const bPri = priorityOrder[b.priority] ?? 2;
    if (aPri !== bPri) return aPri - bPri;
    const aStat = statusOrder[getPropertyStatus(a)] ?? 3;
    const bStat = statusOrder[getPropertyStatus(b)] ?? 3;
    return aStat - bStat;
  });

  const stats = {
    total: properties.length,
    checked: properties.filter((p) => { const s = getPropertyStatus(p); return s === "cleared" || s === "in_progress"; }).length,
    cleared: properties.filter((p) => getPropertyStatus(p) === "cleared").length,
    cameras: properties.filter((p) => p.has_camera || getPropertyStatus(p) === "has_camera").length,
    alerts: properties.filter((p) => getPropertyStatus(p) === "person_of_interest" || getPropertyStatus(p) === "needs_followup").length,
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto" />
          <div className="mt-3 text-sm text-gray-600">Loading Cove Neck Operations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">COVE NECK OPS</h1>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Property Search Operations</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGuide(true)}
                className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-medium"
              >
                Field Guide
              </button>
              <button
                onClick={() => fetchProperties(false)}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-3 mt-2 text-[11px]">
            <span className="text-gray-600">{stats.total} properties</span>
            <span className="text-gray-300">|</span>
            <span className="text-green-600 font-medium">{stats.cleared} cleared</span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600">{stats.checked - stats.cleared} in progress</span>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600">{stats.cameras} cameras</span>
            {stats.alerts > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-red-600 font-bold">{stats.alerts} alerts</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(stats.cleared / stats.total) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
          {([
            ["all", "All"],
            ["not_checked", "Not Checked"],
            ["in_progress", "In Progress"],
            ["cleared", "Cleared"],
            ["needs_followup", "Follow-up"],
            ["has_camera", "Cameras"],
            ["person_of_interest", "Alerts"],
          ] as [FilterStatus, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${
                filter === key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
              {key !== "all" && (
                <span className="ml-1 opacity-70">
                  {properties.filter((p) => getPropertyStatus(p) === key).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Map toggle + map */}
      <div className="px-4 pt-3">
        <button
          onClick={() => setShowMap(!showMap)}
          className="text-xs text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
        >
          <span className={`transition-transform ${showMap ? "rotate-90" : ""}`}>&gt;</span>
          {showMap ? "Hide map" : "Show map"}
        </button>

        {showMap && apiKey && (
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-4" style={{ height: 280 }}>
            <APIProvider apiKey={apiKey}>
              <Map
                defaultCenter={COVE_NECK_CENTER}
                defaultZoom={14}
                mapId="cove-neck-ops-map"
                mapTypeId="satellite"
                disableDefaultUI
                zoomControl
                style={{ width: "100%", height: "100%" }}
              >
                <CoveNeckMapContent
                  properties={properties}
                  selectedId={selectedMapId}
                  onSelectProperty={(id) => {
                    setSelectedMapId(id);
                    setExpandedId(id);
                    document.getElementById(`property-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  zoomTo={selectedMapId ? (() => {
                    const p = properties.find(pr => pr.id === selectedMapId);
                    return p?.latitude && p?.longitude ? { lat: p.latitude, lng: p.longitude } : null;
                  })() : null}
                />
              </Map>
            </APIProvider>
          </div>
        )}
      </div>

      {/* Property list */}
      <div className="px-4 pb-24 space-y-2">
        {properties.length === 0 && (
          <div className="text-center py-8">
            <div className="text-sm text-gray-600 mb-3">No properties loaded yet.</div>
            <button
              onClick={seedProperties}
              disabled={seeding}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
            >
              {seeding ? "Seeding..." : "Seed Cove Neck Properties"}
            </button>
          </div>
        )}

        {sortedProperties.map((property) => (
          <div key={property.id} id={`property-${property.id}`}>
            <PropertyCard
              property={property}
              isExpanded={expandedId === property.id}
              onToggle={() => {
                const opening = expandedId !== property.id;
                setExpandedId(opening ? property.id : null);
                setSelectedMapId(opening ? property.id : null);
                if (opening) setShowMap(true);
              }}
              onUpdate={updateProperty}
            />
          </div>
        ))}

        {filteredProperties.length === 0 && properties.length > 0 && (
          <div className="text-center py-6 text-sm text-gray-500">
            No properties match the &quot;{filter}&quot; filter.
          </div>
        )}
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-4 right-4 z-20 flex flex-col gap-2">
        {properties.length > 0 && !addingProperty && (
          <button
            onClick={seedProperties}
            disabled={seeding}
            className="w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 flex items-center justify-center text-lg disabled:opacity-50"
            title="Seed more properties"
          >
            {seeding ? "..." : "+S"}
          </button>
        )}
        <button
          onClick={() => setAddingProperty(!addingProperty)}
          className="w-14 h-14 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 flex items-center justify-center text-2xl font-light"
          title="Add property"
        >
          {addingProperty ? "X" : "+"}
        </button>
      </div>

      {/* Add property panel */}
      {addingProperty && (
        <div className="fixed bottom-20 right-4 z-20 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-80">
          <div className="text-sm font-semibold text-gray-900 mb-2">Add Property</div>
          <AddressSearch
            onSelect={(result) => addProperty(result)}
            placeholder="Search address on Cove Neck..."
          />
          <button onClick={() => setAddingProperty(false)} className="text-[10px] text-gray-500 mt-2 hover:text-gray-700">
            Cancel
          </button>
        </div>
      )}

      {/* Field Guide Modal */}
      {showGuide && <FieldGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
}
