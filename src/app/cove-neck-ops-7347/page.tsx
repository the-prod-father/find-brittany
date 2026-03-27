"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import AddressSearch from "@/components/AddressSearch";
import ReactMarkdown from "react-markdown";

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
  ai_analysis?: string;
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

// ============================================
// DRAWING / ANNOTATION TYPES
// ============================================

interface MapAnnotation {
  id: string;
  name: string;
  bounds: { north: number; south: number; east: number; west: number };
  question: string;
  response: string;
  createdAt: string;
}

type DrawMode = "pan" | "draw" | "annotations";

function loadAnnotations(): MapAnnotation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cove-neck-annotations");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAnnotations(annotations: MapAnnotation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cove-neck-annotations", JSON.stringify(annotations));
}

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

// Flock Safety ALPR cameras in the Oyster Bay / Cove Neck area (from OpenStreetMap)
const AREA_CAMERAS = [
  { id: "cam-1", lat: 40.870929, lng: -73.504971, label: "Cove Neck Rd Entrance", detail: "Flock Safety ALPR — fixed, direction 59°. CRITICAL chokepoint: only road into Cove Neck peninsula. All vehicle traffic in/out passes this camera.", type: "ALPR", critical: true },
  { id: "cam-2", lat: 40.871099, lng: -73.524209, label: "East Main St / Oyster Bay", detail: "Flock Safety ALPR — fixed, direction 80°. Covers traffic on East Main Street near Oyster Bay downtown.", type: "ALPR", critical: false },
  { id: "cam-3", lat: 40.873878, lng: -73.539399, label: "South St / West Oyster Bay", detail: "Flock Safety ALPR — fixed, direction 297°. Westbound traffic on South Street.", type: "ALPR", critical: false },
  { id: "cam-4", lat: 40.860722, lng: -73.521884, label: "South Shore area", detail: "Flock Safety ALPR — fixed, direction 94°. Covers south approach to Oyster Bay.", type: "ALPR", critical: false },
  { id: "cam-5", lat: 40.901693, lng: -73.548783, label: "Bayville / North", detail: "Flock Safety ALPR — fixed. Northern approach via Bayville. Covers traffic from the north.", type: "ALPR", critical: false },
  { id: "cam-6", lat: 40.840209, lng: -73.515200, label: "Cove Rd / South approach", detail: "Flock Safety ALPR — fixed. Southern approach via Cove Road. Covers traffic from Syosset/Woodbury direction.", type: "ALPR", critical: false },
  { id: "cam-7", lat: 40.841756, lng: -73.501530, label: "Southeast approach", detail: "Flock Safety ALPR — fixed. Southeast approach. Covers traffic from East Norwich direction.", type: "ALPR", critical: false },
];

// ============================================
// HELPERS
// ============================================

function parsePropertyData(notes: string | null): PropertyData {
  if (!notes) return { checklist: {}, notes: "", property_type: "residential", structures: [], checked_by: "", ai_analysis: "" };
  try {
    const parsed = JSON.parse(notes);
    return {
      checklist: parsed.checklist || {},
      notes: parsed.notes || "",
      property_type: parsed.property_type || "residential",
      structures: parsed.structures || [],
      checked_by: parsed.checked_by || "",
      ai_analysis: parsed.ai_analysis || "",
    };
  } catch {
    return { checklist: {}, notes: notes, property_type: "residential", structures: [], checked_by: "", ai_analysis: "" };
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

function shortAddress(address: string): string {
  // Extract just the number and street name, strip city/state
  const parts = address.split(",")[0];
  // Also strip long suffixes like " — Sagamore Hill NHS"
  return parts.split(" — ")[0].trim();
}

// ============================================
// MAP CONTENT COMPONENT
// ============================================

function CoveNeckMapContent({
  properties,
  selectedId,
  onSelectProperty,
  zoomTo,
  showCameras,
  showPolygon,
}: {
  properties: CanvassProperty[];
  selectedId: string | null;
  onSelectProperty: (id: string) => void;
  zoomTo: { lat: number; lng: number } | null;
  showCameras: boolean;
  showPolygon: boolean;
}) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  // Draw / hide Cove Neck polygon
  useEffect(() => {
    if (!map) return;

    if (showPolygon) {
      if (!polygonRef.current) {
        polygonRef.current = new google.maps.Polygon({
          paths: COVE_NECK_POLYGON,
          strokeColor: "#00e5ff",
          strokeOpacity: 0.9,
          strokeWeight: 3,
          fillColor: "#00e5ff",
          fillOpacity: 0.06,
          map,
        });
      } else {
        polygonRef.current.setMap(map);
      }
    } else {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
      }
    }

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
    };
  }, [map, showPolygon]);

  // Zoom to selected property
  useEffect(() => {
    if (!map || !zoomTo) return;
    map.panTo(zoomTo);
    map.setZoom(19);
  }, [map, zoomTo]);

  return (
    <>
      {/* Property markers */}
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
              className={`rounded-full border-2 border-white shadow-md cursor-pointer transition-transform ${isSelected ? "w-5 h-5 scale-125 ring-2 " + config.ring : "w-3.5 h-3.5"}`}
              style={{ backgroundColor: config.color }}
              title={prop.address}
            />
          </AdvancedMarker>
        );
      })}
      {/* ALPR Camera markers */}
      {showCameras && AREA_CAMERAS.map((cam, i) => (
        <AdvancedMarker key={`cam-${i}`} position={{ lat: cam.lat, lng: cam.lng }}>
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow-lg ${cam.critical ? "bg-yellow-400 text-black" : "bg-blue-600 text-white"}`}
            title={cam.label}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>CAM</span>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}

// ============================================
// MAP CONTROLS OVERLAY
// ============================================

function MapControls({
  mapType,
  onMapType,
  streetViewOn,
  onStreetView,
  showCameras,
  onToggleCameras,
  showPolygon,
  onTogglePolygon,
}: {
  mapType: string;
  onMapType: (t: string) => void;
  streetViewOn: boolean;
  onStreetView: () => void;
  showCameras: boolean;
  onToggleCameras: () => void;
  showPolygon: boolean;
  onTogglePolygon: () => void;
}) {
  const btnBase = "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors";
  const btnActive = "bg-white text-gray-900 shadow-sm";
  const btnInactive = "text-gray-300 hover:text-white hover:bg-white/10";

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
      {/* Map type switcher */}
      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-1 flex gap-0.5">
        {[
          { id: "satellite", label: "Satellite" },
          { id: "roadmap", label: "Road" },
          { id: "terrain", label: "Terrain" },
          { id: "3d", label: "3D" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => onMapType(t.id)}
            className={`${btnBase} ${mapType === t.id ? btnActive : btnInactive}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toggle buttons */}
      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-1 flex flex-col gap-0.5">
        <button
          onClick={onStreetView}
          className={`${btnBase} text-left ${streetViewOn ? btnActive : btnInactive}`}
        >
          Street View {streetViewOn ? "ON" : "OFF"}
        </button>
        <button
          onClick={onToggleCameras}
          className={`${btnBase} text-left ${showCameras ? btnActive : btnInactive}`}
        >
          Cameras {showCameras ? "ON" : "OFF"}
        </button>
        <button
          onClick={onTogglePolygon}
          className={`${btnBase} text-left ${showPolygon ? btnActive : btnInactive}`}
        >
          Boundary {showPolygon ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAP WRAPPER (handles Street View + map type)
// ============================================

function MapController({
  mapType,
  streetViewOn,
  selectedProperty,
}: {
  mapType: string;
  streetViewOn: boolean;
  selectedProperty: CanvassProperty | null;
}) {
  const map = useMap();
  const prevStreetView = useRef(false);

  // Handle map type changes
  useEffect(() => {
    if (!map) return;
    if (mapType === "3d") {
      map.setMapTypeId("satellite");
      map.setTilt(45);
    } else {
      map.setMapTypeId(mapType);
      map.setTilt(0);
    }
  }, [map, mapType]);

  // Handle Street View toggle
  useEffect(() => {
    if (!map) return;
    const sv = map.getStreetView();
    if (!sv) return;

    if (streetViewOn) {
      let pos: google.maps.LatLng | google.maps.LatLngLiteral = map.getCenter()!;
      if (selectedProperty?.latitude && selectedProperty?.longitude) {
        pos = { lat: selectedProperty.latitude, lng: selectedProperty.longitude };
      }
      sv.setPosition(pos);
      sv.setVisible(true);
      prevStreetView.current = true;
    } else if (prevStreetView.current) {
      sv.setVisible(false);
      prevStreetView.current = false;
    }
  }, [map, streetViewOn, selectedProperty]);

  return null;
}

// ============================================
// SIDEBAR PROPERTY CARD
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

  const [localNotes, setLocalNotes] = useState(data.notes);
  const [checkedBy, setCheckedBy] = useState(data.checked_by);
  const [aiAnalysis, setAiAnalysis] = useState(data.ai_analysis || "");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");
  const notesTimeout = useRef<NodeJS.Timeout | null>(null);

  const runAiAnalysis = async () => {
    if (!property.latitude || !property.longitude) return;
    setAnalyzing(true);
    setAiError("");
    try {
      const res = await fetch("/api/analyze-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: property.latitude, longitude: property.longitude, address: property.address }),
      });
      const json = await res.json();
      if (res.ok && json.analysis) {
        setAiAnalysis(json.analysis);
        const newData: PropertyData = { ...data, notes: localNotes, checked_by: checkedBy, ai_analysis: json.analysis };
        onUpdate(property.id, { notes: serializePropertyData(newData) });
      } else {
        setAiError(json.error || "Analysis failed");
      }
    } catch (err) {
      setAiError("Network error — try again");
      console.error("AI analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const updateChecklist = (key: keyof PropertyChecklist, value: boolean) => {
    const newData: PropertyData = {
      ...data,
      checklist: { ...data.checklist, [key]: value },
      notes: localNotes,
      checked_by: checkedBy,
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

  return (
    <div className={`border-b border-gray-700/50 transition-colors ${isExpanded ? "bg-gray-800/80" : "hover:bg-gray-800/40"}`}>
      {/* Compact header row */}
      <button onClick={onToggle} className="w-full text-left px-3 py-2.5 flex items-center gap-2">
        {/* Status dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: statusConfig.color }}
        />
        {/* Address */}
        <div className="flex-1 min-w-0 text-[13px] text-gray-200 font-medium truncate">
          {shortAddress(property.address)}
        </div>
        {/* Progress fraction */}
        <span className="text-[10px] text-gray-500 font-mono shrink-0">
          {progress.done}/{progress.total}
        </span>
        {/* Expand chevron */}
        <svg
          className={`w-3.5 h-3.5 text-gray-500 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Full address + status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusConfig.bg}`}>
              {statusConfig.label}
            </span>
            <span className="text-[10px] text-gray-500 truncate">{property.address}</span>
          </div>

          {/* Checked by info */}
          {data.checked_by && (
            <div className="text-[10px] text-gray-500">
              Checked by {data.checked_by}
              {property.contacted_at ? ` at ${new Date(property.contacted_at).toLocaleTimeString()}` : ""}
            </div>
          )}

          {/* AI Analysis */}
          <div>
            {aiAnalysis ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">AI Recon</span>
                  <button
                    onClick={runAiAnalysis}
                    disabled={analyzing}
                    className="text-[9px] text-gray-500 hover:text-cyan-400 transition-colors"
                  >
                    {analyzing ? "Analyzing..." : "Re-run"}
                  </button>
                </div>
                <div className="text-[11px] text-gray-300 leading-relaxed bg-gray-900/60 border border-gray-700/50 rounded-md p-2.5 prose prose-invert prose-xs max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_strong]:text-cyan-300">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={runAiAnalysis}
                  disabled={analyzing}
                  className="w-full py-2.5 bg-cyan-900/30 text-cyan-400 border border-cyan-800/50 rounded-md hover:bg-cyan-900/50 text-[12px] font-medium transition-colors disabled:opacity-50"
                >
                  {analyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                      Analyzing satellite imagery...
                    </span>
                  ) : (
                    "Run AI Recon"
                  )}
                </button>
                {aiError && (
                  <div className="text-[10px] text-red-400 text-center">{aiError}</div>
                )}
              </div>
            )}
          </div>

          {/* Search Checklist */}
          <div>
            <div className="text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Checklist ({progress.done}/{progress.total})
            </div>
            <div className="space-y-0.5">
              {CHECKLIST_ITEMS.map((item) => (
                <label key={item.key} className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-gray-700/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!data.checklist[item.key]}
                    onChange={(e) => updateChecklist(item.key, e.target.checked)}
                    className="mt-0.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className={`text-[12px] leading-tight ${data.checklist[item.key] ? "text-gray-600 line-through" : "text-gray-300"}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Notes</label>
            <textarea
              value={localNotes}
              onChange={(e) => saveNotes(e.target.value)}
              placeholder="Signs of entry, observations..."
              rows={2}
              className="w-full text-[12px] bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Checked by */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">Checked by</label>
            <input
              type="text"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              onBlur={() => saveCheckedBy(checkedBy)}
              placeholder="Your name"
              className="w-full text-[12px] bg-gray-800 border border-gray-700 rounded-md px-2.5 py-1.5 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Quick status buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => markStatus("cleared")} className="text-[10px] px-2 py-1 bg-green-900/40 text-green-400 border border-green-800 rounded-md hover:bg-green-900/60 font-medium">
              Mark Cleared
            </button>
            <button onClick={() => markStatus("needs_followup")} className="text-[10px] px-2 py-1 bg-purple-900/40 text-purple-400 border border-purple-800 rounded-md hover:bg-purple-900/60 font-medium">
              Follow-up
            </button>
            <button onClick={() => markStatus("has_camera")} className="text-[10px] px-2 py-1 bg-blue-900/40 text-blue-400 border border-blue-800 rounded-md hover:bg-blue-900/60 font-medium">
              Has Camera
            </button>
            <button onClick={() => markStatus("person_of_interest")} className="text-[10px] px-2 py-1 bg-red-900/40 text-red-400 border border-red-800 rounded-md hover:bg-red-900/60 font-medium">
              ALERT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAP TOOLBAR (left side of map)
// ============================================

function MapToolbar({
  drawMode,
  onSetMode,
  annotationsVisible,
  onToggleAnnotations,
  annotationCount,
}: {
  drawMode: DrawMode;
  onSetMode: (m: DrawMode) => void;
  annotationsVisible: boolean;
  onToggleAnnotations: () => void;
  annotationCount: number;
}) {
  const btnBase = "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative";
  const btnActive = "bg-cyan-500 text-white shadow-lg";
  const btnInactive = "text-gray-400 hover:bg-white/10 hover:text-white";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-1 bg-gray-900/90 backdrop-blur-md border border-gray-700/50 rounded-2xl px-2 py-1.5 shadow-2xl">
        {/* Pan */}
        <button
          onClick={() => onSetMode("pan")}
          className={`${btnBase} ${drawMode === "pan" ? btnActive : btnInactive}`}
          title="Pan"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-700 mx-0.5" />

        {/* Draw Rectangle */}
        <button
          onClick={() => onSetMode(drawMode === "draw" ? "pan" : "draw")}
          className={`${btnBase} ${drawMode === "draw" ? btnActive : btnInactive}`}
          title="Draw — click two points to select an area"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="5 3" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-700 mx-0.5" />

        {/* Annotations toggle */}
        <button
          onClick={onToggleAnnotations}
          className={`${btnBase} ${annotationsVisible ? btnActive : btnInactive}`}
          title={`Pins ${annotationsVisible ? "ON" : "OFF"} (${annotationCount})`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {annotationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {annotationCount}
            </span>
          )}
        </button>
      </div>

      {/* Mode label */}
      {drawMode === "draw" && (
        <div className="text-center mt-2">
          <span className="text-[11px] bg-cyan-500/90 text-white px-3 py-1 rounded-full font-medium shadow-lg">
            Click two points to select an area
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// DRAWING MANAGER (two-click rectangle + AI chat)
// ============================================

function DrawingManager({
  drawMode,
  onFinishDraw,
  annotations,
  annotationsVisible,
  onDeleteAnnotation,
  onOpenAnnotation,
  activeBounds,
}: {
  drawMode: DrawMode;
  onFinishDraw: (bounds: { north: number; south: number; east: number; west: number }) => void;
  annotations: MapAnnotation[];
  annotationsVisible: boolean;
  onDeleteAnnotation: (id: string) => void;
  onOpenAnnotation: (id: string) => void;
  activeBounds: { north: number; south: number; east: number; west: number } | null;
}) {
  const map = useMap();
  const firstCornerRef = useRef<{ lat: number; lng: number } | null>(null);
  const [firstCorner, setFirstCorner] = useState<{ lat: number; lng: number } | null>(null);
  const previewRectRef = useRef<google.maps.Rectangle | null>(null);
  const firstMarkerRef = useRef<google.maps.Marker | null>(null);
  const moveListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const annotationRectsRef = useRef<google.maps.Rectangle[]>([]);
  const annotationLabelsRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [viewingAnnotation, setViewingAnnotation] = useState<string | null>(null);

  // Handle draw mode click events on the map
  useEffect(() => {
    if (!map) return;
    if (drawMode !== "draw") {
      // Clean up preview state when leaving draw mode
      if (previewRectRef.current) { previewRectRef.current.setMap(null); previewRectRef.current = null; }
      if (firstMarkerRef.current) { firstMarkerRef.current.setMap(null); firstMarkerRef.current = null; }
      if (moveListenerRef.current) { google.maps.event.removeListener(moveListenerRef.current); moveListenerRef.current = null; }
      firstCornerRef.current = null;
      setFirstCorner(null);
      return;
    }

    // Set crosshair cursor
    map.setOptions({ draggableCursor: "crosshair" });

    const clickListener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const latLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };

      if (!firstCornerRef.current) {
        // First click — set corner 1
        firstCornerRef.current = latLng;
        setFirstCorner(latLng);

        // Add a small marker at corner 1
        firstMarkerRef.current = new google.maps.Marker({
          position: latLng,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: "#00e5ff",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        // Preview rectangle on mouse move
        previewRectRef.current = new google.maps.Rectangle({
          bounds: { north: latLng.lat, south: latLng.lat, east: latLng.lng, west: latLng.lng },
          strokeColor: "#00e5ff",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: "#00e5ff",
          fillOpacity: 0.15,
          map,
          clickable: false,
        });

        moveListenerRef.current = map.addListener("mousemove", (me: google.maps.MapMouseEvent) => {
          if (!me.latLng || !firstCornerRef.current || !previewRectRef.current) return;
          const c1 = firstCornerRef.current;
          const c2 = { lat: me.latLng.lat(), lng: me.latLng.lng() };
          previewRectRef.current.setBounds({
            north: Math.max(c1.lat, c2.lat),
            south: Math.min(c1.lat, c2.lat),
            east: Math.max(c1.lng, c2.lng),
            west: Math.min(c1.lng, c2.lng),
          });
        });
      } else {
        // Second click — finalize rectangle
        const c1 = firstCornerRef.current;
        const c2 = latLng;
        const bounds = {
          north: Math.max(c1.lat, c2.lat),
          south: Math.min(c1.lat, c2.lat),
          east: Math.max(c1.lng, c2.lng),
          west: Math.min(c1.lng, c2.lng),
        };

        // Clean up preview
        if (previewRectRef.current) { previewRectRef.current.setMap(null); previewRectRef.current = null; }
        if (firstMarkerRef.current) { firstMarkerRef.current.setMap(null); firstMarkerRef.current = null; }
        if (moveListenerRef.current) { google.maps.event.removeListener(moveListenerRef.current); moveListenerRef.current = null; }
        firstCornerRef.current = null;
        setFirstCorner(null);

        onFinishDraw(bounds);
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      map.setOptions({ draggableCursor: null });
      if (moveListenerRef.current) { google.maps.event.removeListener(moveListenerRef.current); moveListenerRef.current = null; }
      if (previewRectRef.current) { previewRectRef.current.setMap(null); previewRectRef.current = null; }
      if (firstMarkerRef.current) { firstMarkerRef.current.setMap(null); firstMarkerRef.current = null; }
    };
  }, [map, drawMode, onFinishDraw]);

  // Render saved annotation rectangles
  useEffect(() => {
    // Clear existing
    annotationRectsRef.current.forEach(r => r.setMap(null));
    annotationRectsRef.current = [];
    annotationLabelsRef.current.forEach(m => (m.map = null));
    annotationLabelsRef.current = [];

    if (!map || !annotationsVisible) return;

    annotations.forEach((ann) => {
      // Rectangle
      const rect = new google.maps.Rectangle({
        bounds: ann.bounds,
        strokeColor: "#00e5ff",
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: "#00e5ff",
        fillOpacity: 0.05,
        map,
        clickable: true,
      });
      rect.addListener("click", () => {
        setViewingAnnotation(ann.id);
      });
      annotationRectsRef.current.push(rect);
    });

    return () => {
      annotationRectsRef.current.forEach(r => r.setMap(null));
      annotationRectsRef.current = [];
      annotationLabelsRef.current.forEach(m => (m.map = null));
      annotationLabelsRef.current = [];
    };
  }, [map, annotations, annotationsVisible]);

  // Render active bounds rectangle (the one being queried)
  const activeRectRef = useRef<google.maps.Rectangle | null>(null);
  useEffect(() => {
    if (activeRectRef.current) { activeRectRef.current.setMap(null); activeRectRef.current = null; }
    if (!map || !activeBounds) return;
    activeRectRef.current = new google.maps.Rectangle({
      bounds: activeBounds,
      strokeColor: "#00e5ff",
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: "#00e5ff",
      fillOpacity: 0.2,
      map,
      clickable: false,
    });
    return () => {
      if (activeRectRef.current) { activeRectRef.current.setMap(null); activeRectRef.current = null; }
    };
  }, [map, activeBounds]);

  const viewedAnnotation = viewingAnnotation ? annotations.find(a => a.id === viewingAnnotation) : null;

  return (
    <>
      {/* Annotation labels as AdvancedMarkers */}
      {annotationsVisible && annotations.map((ann) => {
        const centerLat = (ann.bounds.north + ann.bounds.south) / 2;
        const centerLng = (ann.bounds.east + ann.bounds.west) / 2;
        return (
          <AdvancedMarker
            key={`ann-label-${ann.id}`}
            position={{ lat: centerLat, lng: centerLng }}
            onClick={() => setViewingAnnotation(ann.id)}
          >
            <div className="px-2 py-1 bg-black/80 backdrop-blur-sm text-cyan-300 text-[10px] font-medium rounded shadow-lg cursor-pointer hover:bg-black/90 max-w-[160px] truncate border border-cyan-800/50">
              {ann.name || ann.question.slice(0, 30)}
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Draw mode hint */}
      {drawMode === "draw" && !firstCorner && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm text-cyan-300 text-[12px] font-medium px-4 py-2 rounded-lg shadow-lg pointer-events-none">
          Click to set first corner of rectangle
        </div>
      )}
      {drawMode === "draw" && firstCorner && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm text-cyan-300 text-[12px] font-medium px-4 py-2 rounded-lg shadow-lg pointer-events-none">
          Click to set second corner
        </div>
      )}

      {/* Annotation detail popup */}
      {viewedAnnotation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[340px] max-w-[90vw] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-gray-700/50 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-cyan-400">{viewedAnnotation.name || "Location"}</span>
            <button onClick={() => setViewingAnnotation(null)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</button>
          </div>
          <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
            <div className="text-[10px] text-gray-500">Q: {viewedAnnotation.question}</div>
            <div className="text-[11px] text-gray-400 leading-relaxed prose prose-invert prose-xs max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_strong]:text-cyan-300">
              <ReactMarkdown>{viewedAnnotation.response}</ReactMarkdown>
            </div>
            <div className="text-[9px] text-gray-600">{new Date(viewedAnnotation.createdAt).toLocaleString()}</div>
          </div>
          <div className="p-3 border-t border-gray-700/50 flex justify-end">
            <button
              onClick={() => {
                onDeleteAnnotation(viewedAnnotation.id);
                setViewingAnnotation(null);
              }}
              className="text-[10px] px-3 py-1.5 bg-red-900/40 text-red-400 border border-red-800 rounded-md hover:bg-red-900/60 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// AI CHAT OVERLAY — standalone (no useMap needed)
// ============================================

function AiChatOverlayStandalone({
  bounds,
  onPin,
  onDismiss,
}: {
  bounds: { north: number; south: number; east: number; west: number };
  onPin: (annotation: MapAnnotation) => void;
  onDismiss: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [pinName, setPinName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  const handleSubmit = async () => {
    const q = question.trim() || "What is this?";
    setLoading(true);
    setError("");
    try {
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;
      const res = await fetch("/api/analyze-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: centerLat,
          longitude: centerLng,
          address: `Area inquiry: ${q} (bounds: ${bounds.south.toFixed(5)},${bounds.west.toFixed(5)} to ${bounds.north.toFixed(5)},${bounds.east.toFixed(5)})`,
        }),
      });
      const json = await res.json();
      if (res.ok && json.analysis) {
        setResponse(json.analysis);
      } else {
        setError(json.error || "Analysis failed");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  };

  const handlePin = () => {
    const q = question.trim() || "What is this?";
    const name = pinName.trim() || q.slice(0, 40);
    const annotation: MapAnnotation = {
      id: crypto.randomUUID(),
      name,
      bounds,
      question: q,
      response,
      createdAt: new Date().toISOString(),
    };
    onPin(annotation);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[380px] max-w-[90vw] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {!response ? (
        <>
          <div className="p-3 border-b border-gray-700/50">
            <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              What do you want to know about this area?
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is this?"
                onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleSubmit(); }}
                className="flex-1 text-[12px] bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-cyan-600 text-white text-[12px] font-medium rounded-md hover:bg-cyan-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : "Send"}
              </button>
            </div>
            {error && <div className="text-[10px] text-red-400 mt-1.5">{error}</div>}
          </div>
          <div className="px-3 py-2 flex justify-end">
            <button onClick={onDismiss} className="text-[10px] text-gray-500 hover:text-gray-300">Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="p-3 border-b border-gray-700/50">
            <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">AI Response</div>
            <div className="text-[11px] text-gray-500 mb-2">{question.trim() || "What is this?"}</div>
          </div>
          <div className="p-3 max-h-[40vh] overflow-y-auto">
            <div className="text-[11px] text-gray-300 leading-relaxed prose prose-invert prose-xs max-w-none [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_strong]:text-cyan-300">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          </div>
          <div className="p-3 border-t border-gray-700/50">
            {showNameInput ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-cyan-400">Name this location:</div>
                <input
                  type="text"
                  value={pinName}
                  onChange={(e) => setPinName(e.target.value)}
                  placeholder='e.g. "Old barn behind Sagamore Hill"'
                  onKeyDown={(e) => { if (e.key === "Enter") handlePin(); }}
                  className="w-full text-[12px] bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNameInput(false)} className="text-[10px] px-3 py-1.5 text-gray-500 hover:text-gray-300">Back</button>
                  <button onClick={handlePin} className="text-[10px] px-3 py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 font-medium">Save Location</button>
                </div>
              </div>
            ) : (
            <div className="flex gap-2 justify-end">
            <button
              onClick={onDismiss}
              className="text-[10px] px-3 py-1.5 bg-gray-800 text-gray-400 border border-gray-700 rounded-md hover:bg-gray-700 font-medium"
            >
              Dismiss
            </button>
            <button
              onClick={() => setShowNameInput(true)}
              className="text-[10px] px-3 py-1.5 bg-cyan-900/50 text-cyan-400 border border-cyan-800 rounded-md hover:bg-cyan-900/70 font-medium"
            >
              Save Location
            </button>
          </div>
            )}
          </div>
        </>
      )}
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
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchText, setSearchText] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [addingProperty, setAddingProperty] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" && window.innerWidth >= 1024);
  const [mapType, setMapType] = useState("satellite");
  const [streetViewOn, setStreetViewOn] = useState(false);
  const [showCameras, setShowCameras] = useState(true);
  const [showPolygon, setShowPolygon] = useState(true);
  const [showCameraList, setShowCameraList] = useState(false);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("pan");
  const [drawnBounds, setDrawnBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [annotations, setAnnotations] = useState<MapAnnotation[]>(() => loadAnnotations());
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
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

  // Auto-seed once if DB is empty (guarded by ref to prevent duplicates)
  const autoSeeded = useRef(false);
  useEffect(() => {
    if (!loading && properties.length === 0 && !autoSeeded.current && !seeding) {
      autoSeeded.current = true;
      setSeeding(true);
      (async () => {
        for (const prop of SEED_PROPERTIES) {
          await fetch("/api/canvass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prop),
          });
        }
        await fetchProperties();
        setSeeding(false);
      })();
    }
  }, [loading, properties.length, seeding, fetchProperties]);

  // Filter + search
  const filteredProperties = properties.filter((p) => {
    if (filter !== "all" && getPropertyStatus(p) !== filter) return false;
    if (searchText.trim()) {
      return p.address.toLowerCase().includes(searchText.toLowerCase());
    }
    return true;
  });

  // Sort: critical first, then by status
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

  // Compute zoom target from selectedMapId or selectedCamId
  const zoomTarget = (() => {
    if (selectedCamId) {
      const cam = AREA_CAMERAS.find(c => c.id === selectedCamId);
      return cam ? { lat: cam.lat, lng: cam.lng } : null;
    }
    if (selectedMapId) {
      const p = properties.find(pr => pr.id === selectedMapId);
      return p?.latitude && p?.longitude ? { lat: p.latitude, lng: p.longitude } : null;
    }
    return null;
  })();

  const selectedProperty = selectedMapId ? properties.find(p => p.id === selectedMapId) || null : null;

  // Select property from map marker
  const handleMapSelect = (id: string) => {
    setSelectedMapId(id);
    setSelectedCamId(null);
    setExpandedId(id);
    setShowCameraList(false);
    setFilter("all");
    // Open sidebar on mobile
    setSidebarOpen(true);
    // Scroll to property in sidebar
    setTimeout(() => {
      document.getElementById(`property-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Select property from sidebar
  const handleSidebarToggle = (id: string) => {
    const opening = expandedId !== id;
    setExpandedId(opening ? id : null);
    setSelectedMapId(opening ? id : null);
    setSelectedCamId(null);
    setShowCameraList(false);
  };

  // Drawing handlers
  const handleFinishDraw = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    setDrawnBounds(bounds);
    setDrawMode("pan");
  }, []);

  const handlePinAnnotation = useCallback((annotation: MapAnnotation) => {
    const updated = [...annotations, annotation];
    setAnnotations(updated);
    saveAnnotations(updated);
    setDrawnBounds(null);
    setAnnotationsVisible(true);
  }, [annotations]);

  const handleDismissDrawing = useCallback(() => {
    setDrawnBounds(null);
  }, []);

  const handleDeleteAnnotation = useCallback((id: string) => {
    const updated = annotations.filter(a => a.id !== id);
    setAnnotations(updated);
    saveAnnotations(updated);
  }, [annotations]);

  const handleOpenAnnotation = useCallback((id: string) => {
    // Handled inside DrawingManager
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto" />
          <div className="mt-3 text-sm text-gray-400">Loading Cove Neck Operations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex bg-gray-950">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-black/70 backdrop-blur-sm text-white w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* LEFT SIDEBAR */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:relative z-40 lg:z-auto lg:translate-x-0 h-full w-[380px] max-w-[85vw] bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200`}
      >
        {/* Sidebar Header */}
        <div className="shrink-0 p-4 border-b border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">COVE NECK OPS</h1>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Property Search Operations</div>
            </div>
            <button
              onClick={() => fetchProperties(false)}
              className="text-gray-500 hover:text-gray-300 p-1.5 rounded-md hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-2">
            <span className="text-green-400 font-semibold">{stats.cleared}</span>
            <span>/</span>
            <span>{stats.total} cleared</span>
            {stats.alerts > 0 && (
              <>
                <span className="text-gray-600">|</span>
                <span className="text-red-400 font-semibold">{stats.alerts} alerts</span>
              </>
            )}
            <span className="text-gray-600">|</span>
            <span className="text-blue-400">{stats.cameras} cam</span>
          </div>

          {/* Progress bar */}
          {stats.total > 0 && (
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(stats.cleared / stats.total) * 100}%` }}
              />
            </div>
          )}

          {/* Search bar */}
          <div className="relative mb-2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Filter by address..."
              className="w-full text-[12px] bg-gray-800 border border-gray-700 rounded-md pl-8 pr-3 py-1.5 text-gray-200 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-1 flex-wrap">
            {([
              ["all", "All"],
              ["not_checked", "Not Checked"],
              ["in_progress", "In Progress"],
              ["cleared", "Cleared"],
              ["needs_followup", "Follow-up"],
              ["has_camera", "Cameras"],
              ["person_of_interest", "Alerts"],
            ] as [FilterStatus, string][]).map(([key, label]) => {
              const count = key === "all" ? properties.length : properties.filter((p) => getPropertyStatus(p) === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                    filter === key
                      ? "bg-white text-gray-900"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
            <button
              onClick={() => setShowCameraList(!showCameraList)}
              className={`text-[10px] px-2 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                showCameraList
                  ? "bg-yellow-400 text-black"
                  : "bg-gray-800 text-yellow-400 hover:bg-gray-700"
              }`}
            >
              ALPR Cams <span className="opacity-60">{AREA_CAMERAS.length}</span>
            </button>
          </div>
        </div>

        {/* Camera list view */}
        {showCameraList && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2 border-b border-gray-700/50">
              <div className="text-[11px] font-semibold text-yellow-400 uppercase tracking-wider">ALPR Camera Locations</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Flock Safety license plate readers. Contact NCPD for footage access.</div>
            </div>
            {AREA_CAMERAS.map((cam) => (
              <button
                key={cam.id}
                onClick={() => {
                  setSelectedCamId(cam.id);
                  setSelectedMapId(null);
                  setExpandedId(null);
                }}
                className={`w-full text-left px-3 py-3 border-b border-gray-700/30 hover:bg-gray-800/60 transition-colors ${selectedCamId === cam.id ? "bg-gray-800/80" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cam.critical ? "bg-yellow-400 text-black" : "bg-blue-500/80 text-white"}`}>
                    CAM
                  </span>
                  <span className="text-[13px] text-gray-200 font-medium">{cam.label}</span>
                </div>
                <div className="text-[11px] text-gray-400 leading-relaxed">{cam.detail}</div>
                <div className="flex gap-2 mt-2">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCamId(cam.id);
                      setStreetViewOn(true);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    Street View
                  </span>
                  <span className="text-[10px] text-gray-600">|</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCamId(cam.id);
                      setStreetViewOn(false);
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    Satellite
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Property list (scrollable) */}
        {!showCameraList && (
        <div className="flex-1 overflow-y-auto">
          {properties.length === 0 && (
            <div className="text-center py-8 px-4">
              <div className="text-sm text-gray-500">
                {seeding ? "Loading properties..." : "No properties loaded."}
              </div>
              {seeding && (
                <div className="mt-3 animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto" />
              )}
            </div>
          )}

          {sortedProperties.map((property) => (
            <div key={property.id} id={`property-${property.id}`}>
              <PropertyCard
                property={property}
                isExpanded={expandedId === property.id}
                onToggle={() => handleSidebarToggle(property.id)}
                onUpdate={updateProperty}
              />
            </div>
          ))}

          {filteredProperties.length === 0 && properties.length > 0 && (
            <div className="text-center py-6 text-sm text-gray-600">
              No properties match the current filter.
            </div>
          )}
        </div>
        )}

        {/* Sidebar Footer */}
        <div className="shrink-0 p-3 border-t border-gray-800 flex items-center gap-2">
          <button
            onClick={() => setAddingProperty(!addingProperty)}
            className="flex-1 text-[11px] px-3 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 font-medium transition-colors"
          >
            + Add Property
          </button>
          <a
            href="/"
            className="text-[11px] px-3 py-2 bg-gray-800 text-gray-400 rounded-md hover:bg-gray-700 hover:text-gray-300 transition-colors"
          >
            Ops Hub
          </a>
        </div>

        {/* Add property popover */}
        {addingProperty && (
          <div className="absolute bottom-14 left-3 right-3 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3">
            <div className="text-[12px] font-semibold text-gray-300 mb-2">Add Property</div>
            <AddressSearch
              onSelect={(result) => addProperty(result)}
              placeholder="Search address on Cove Neck..."
            />
            <button onClick={() => setAddingProperty(false)} className="text-[10px] text-gray-500 mt-2 hover:text-gray-300">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Sidebar backdrop on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* RIGHT: FULL MAP */}
      <div className="flex-1 relative">
        {apiKey ? (
          <>
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
                onSelectProperty={handleMapSelect}
                zoomTo={zoomTarget}
                showCameras={showCameras}
                showPolygon={showPolygon}
              />
              <MapController
                mapType={mapType}
                streetViewOn={streetViewOn}
                selectedProperty={selectedProperty}
              />
              <DrawingManager
                drawMode={drawMode}
                onFinishDraw={handleFinishDraw}
                annotations={annotations}
                annotationsVisible={annotationsVisible}
                onDeleteAnnotation={handleDeleteAnnotation}
                onOpenAnnotation={handleOpenAnnotation}
                activeBounds={drawnBounds}
              />
            </Map>
          </APIProvider>
          {/* AI Chat Overlay — positioned on top of the map container */}
          {drawnBounds && (
            <AiChatOverlayStandalone
              bounds={drawnBounds}
              onPin={handlePinAnnotation}
              onDismiss={handleDismissDrawing}
            />
          )}
          </>
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-500 text-sm">
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to load map
          </div>
        )}

        {/* Map Toolbar (Figma-style, bottom center) */}
        <MapToolbar
          drawMode={drawMode}
          onSetMode={setDrawMode}
          annotationsVisible={annotationsVisible}
          onToggleAnnotations={() => setAnnotationsVisible(!annotationsVisible)}
          annotationCount={annotations.length}
        />

        {/* Map Controls Overlay */}
        <MapControls
          mapType={mapType}
          onMapType={setMapType}
          streetViewOn={streetViewOn}
          onStreetView={() => setStreetViewOn(!streetViewOn)}
          showCameras={showCameras}
          onToggleCameras={() => setShowCameras(!showCameras)}
          showPolygon={showPolygon}
          onTogglePolygon={() => setShowPolygon(!showPolygon)}
        />
      </div>
    </div>
  );
}
