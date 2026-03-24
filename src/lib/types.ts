export type TipStatus = "pending" | "under_review" | "verified" | "dismissed" | "critical";
export type EvidenceType = "photo" | "video" | "document" | "screenshot" | "audio" | "social_media_link" | "other";
export type SightingConfidence = "uncertain" | "possible" | "likely" | "confirmed";
export type TimelineEventType = "sighting" | "tip" | "evidence" | "police_action" | "search_effort" | "media" | "other";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export interface Tip {
  id: string;
  created_at: string;
  updated_at: string;
  submitter_name: string | null;
  submitter_email: string | null;
  submitter_phone: string | null;
  is_anonymous: boolean;
  title: string;
  description: string;
  tip_date: string | null;
  location_description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: TipStatus;
  urgency: UrgencyLevel;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source: string;
}

export interface Evidence {
  id: string;
  created_at: string;
  updated_at: string;
  tip_id: string | null;
  evidence_type: EvidenceType;
  title: string;
  description: string | null;
  file_path: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  original_filename: string | null;
  capture_date: string | null;
  latitude: number | null;
  longitude: number | null;
  location_description: string | null;
  status: TipStatus;
  reviewer_notes: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  chain_of_custody: Record<string, unknown>[];
}

export interface Sighting {
  id: string;
  created_at: string;
  sighting_date: string;
  description: string;
  confidence: SightingConfidence;
  latitude: number;
  longitude: number;
  location_description: string | null;
  clothing_description: string | null;
  direction_of_travel: string | null;
  accompanied_by: string | null;
  demeanor: string | null;
  verified: boolean;
}

export interface TimelineEvent {
  id: string;
  created_at: string;
  event_type: TimelineEventType;
  event_date: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  location_description: string | null;
  is_public: boolean;
  is_pinned: boolean;
  source: string | null;
  source_url: string | null;
}

export interface SearchZone {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: UrgencyLevel;
  searched_date: string | null;
  searched_by: string | null;
  notes: string | null;
}

// Form submission types
export interface TipSubmission {
  submitter_name?: string;
  submitter_email?: string;
  submitter_phone?: string;
  is_anonymous: boolean;
  title: string;
  description: string;
  tip_date?: string;
  location_description?: string;
  latitude?: number;
  longitude?: number;
}

export interface EvidenceSubmission {
  tip_id?: string;
  evidence_type: EvidenceType;
  title: string;
  description?: string;
  capture_date?: string;
  latitude?: number;
  longitude?: number;
  location_description?: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  file: File;
}

// Case constants
export const CASE_INFO = {
  subject: {
    name: "Brittany Kritis-Garip",
    dob: "1994-03-03",
    age: 32,
    height: "5'7\"",
    weight: "140 lbs",
    hair: "Brown",
    eyes: "Brown",
    lastWearing: "Black pants, black jacket with fur collar",
  },
  disappearance: {
    date: "2026-03-20",
    time: "20:14",
    lastSeenLocation: "McCouns Lane, East Norwich / Oyster Bay border",
    lastSeenCoords: { lat: 40.8728, lng: -73.5340 },
    reportedTime: "20:30",
    circumstances: "Jumped from moving car in panicked state. Threw phone into bushes. Ran off on foot.",
  },
  contacts: {
    police: { name: "Nassau County PD Missing Persons", phone: "516-573-7347" },
    husband: { name: "Fernando Garip", phone: "(201) 638-6559" },
    father: { name: "George (Father)", phone: "(516) 807-1548" },
    emergency: "911",
  },
  mapCenter: { lat: 40.8700, lng: -73.5320 },
  defaultZoom: 15,
} as const;
