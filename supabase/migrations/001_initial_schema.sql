-- ============================================
-- FIND BRITTANY - Investigation Tracking Platform
-- Supabase Schema v1
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE tip_status AS ENUM ('pending', 'under_review', 'verified', 'dismissed', 'critical');
CREATE TYPE evidence_type AS ENUM ('photo', 'video', 'document', 'screenshot', 'audio', 'social_media_link', 'other');
CREATE TYPE sighting_confidence AS ENUM ('uncertain', 'possible', 'likely', 'confirmed');
CREATE TYPE timeline_event_type AS ENUM ('sighting', 'tip', 'evidence', 'police_action', 'search_effort', 'media', 'other');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');

-- ============================================
-- TIPS TABLE - Public submissions
-- ============================================

CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Submitter info (optional for anonymous tips)
  submitter_name TEXT,
  submitter_email TEXT,
  submitter_phone TEXT,
  is_anonymous BOOLEAN DEFAULT false,

  -- Tip content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tip_date TIMESTAMPTZ,  -- When the event they're reporting happened

  -- Location
  location_description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_point GEOMETRY(Point, 4326),

  -- Moderation
  status tip_status NOT NULL DEFAULT 'pending',
  urgency urgency_level DEFAULT 'medium',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Metadata
  source TEXT DEFAULT 'web',  -- web, phone, email, social_media
  ip_hash TEXT,  -- Hashed for abuse prevention, not tracking
  user_agent TEXT
);

-- ============================================
-- EVIDENCE TABLE - Files and media
-- ============================================

CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Link to tip (optional - evidence can exist independently)
  tip_id UUID REFERENCES tips(id) ON DELETE SET NULL,

  -- Evidence details
  evidence_type evidence_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- File storage
  file_path TEXT,  -- Supabase storage path
  file_url TEXT,   -- Public or signed URL
  file_size_bytes BIGINT,
  mime_type TEXT,

  -- Metadata
  original_filename TEXT,
  capture_date TIMESTAMPTZ,  -- When the photo/video was taken

  -- Location (from EXIF or manual entry)
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_point GEOMETRY(Point, 4326),
  location_description TEXT,

  -- Moderation
  status tip_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Chain of custody
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  chain_of_custody JSONB DEFAULT '[]'::jsonb
);

-- ============================================
-- SIGHTINGS TABLE - Verified or reported sightings
-- ============================================

CREATE TABLE sightings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Link to originating tip
  tip_id UUID REFERENCES tips(id) ON DELETE SET NULL,

  -- Sighting details
  sighting_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  confidence sighting_confidence NOT NULL DEFAULT 'uncertain',

  -- Location (required for sightings)
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_point GEOMETRY(Point, 4326) NOT NULL,
  location_description TEXT,

  -- Subject details at time of sighting
  clothing_description TEXT,
  direction_of_travel TEXT,
  accompanied_by TEXT,  -- Was she alone or with someone
  demeanor TEXT,        -- Calm, distressed, confused, etc.

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT
);

-- ============================================
-- TIMELINE TABLE - Master case timeline
-- ============================================

CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  event_type timeline_event_type NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Location (optional)
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_point GEOMETRY(Point, 4326),
  location_description TEXT,

  -- Links to other records
  tip_id UUID REFERENCES tips(id),
  evidence_id UUID REFERENCES evidence(id),
  sighting_id UUID REFERENCES sightings(id),

  -- Display
  is_public BOOLEAN DEFAULT true,  -- Show on public timeline
  is_pinned BOOLEAN DEFAULT false,
  source TEXT,
  source_url TEXT
);

-- ============================================
-- SEARCH ZONES TABLE - Active search areas
-- ============================================

CREATE TABLE search_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  name TEXT NOT NULL,
  description TEXT,

  -- GeoJSON polygon for the search area
  zone_geometry GEOMETRY(Polygon, 4326),

  -- Status
  status TEXT NOT NULL DEFAULT 'active',  -- active, completed, planned
  priority urgency_level DEFAULT 'medium',
  searched_date TIMESTAMPTZ,
  searched_by TEXT,
  notes TEXT
);

-- ============================================
-- WEATHER SNAPSHOTS - Conditions at key times
-- ============================================

CREATE TABLE weather_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  captured_at TIMESTAMPTZ NOT NULL,

  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,

  temperature_f DOUBLE PRECISION,
  feels_like_f DOUBLE PRECISION,
  humidity INTEGER,
  wind_speed_mph DOUBLE PRECISION,
  wind_direction TEXT,
  visibility_miles DOUBLE PRECISION,
  conditions TEXT,
  sunset_time TIMESTAMPTZ,
  sunrise_time TIMESTAMPTZ,
  moon_phase TEXT,

  raw_data JSONB
);

-- ============================================
-- TRANSIT SNAPSHOTS - Train schedules at key times
-- ============================================

CREATE TABLE transit_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  station_name TEXT NOT NULL,
  line TEXT NOT NULL,  -- e.g., 'LIRR Oyster Bay Branch'

  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  destination TEXT,
  direction TEXT,  -- inbound/outbound

  raw_data JSONB
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tips_status ON tips(status);
CREATE INDEX idx_tips_created ON tips(created_at DESC);
CREATE INDEX idx_tips_location ON tips USING GIST(location_point);
CREATE INDEX idx_tips_urgency ON tips(urgency);

CREATE INDEX idx_evidence_status ON evidence(status);
CREATE INDEX idx_evidence_tip ON evidence(tip_id);
CREATE INDEX idx_evidence_type ON evidence(evidence_type);
CREATE INDEX idx_evidence_location ON evidence USING GIST(location_point);

CREATE INDEX idx_sightings_date ON sightings(sighting_date DESC);
CREATE INDEX idx_sightings_confidence ON sightings(confidence);
CREATE INDEX idx_sightings_location ON sightings USING GIST(location_point);

CREATE INDEX idx_timeline_date ON timeline_events(event_date DESC);
CREATE INDEX idx_timeline_type ON timeline_events(event_type);
CREATE INDEX idx_timeline_public ON timeline_events(is_public) WHERE is_public = true;

CREATE INDEX idx_search_zones_status ON search_zones(status);
CREATE INDEX idx_search_zones_geometry ON search_zones USING GIST(zone_geometry);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_snapshots ENABLE ROW LEVEL SECURITY;

-- Public can INSERT tips (submit)
CREATE POLICY "Anyone can submit tips" ON tips
  FOR INSERT WITH CHECK (true);

-- Public can view verified/non-sensitive tips
CREATE POLICY "Public can view approved tips" ON tips
  FOR SELECT USING (status IN ('verified', 'critical'));

-- Admins can do everything
CREATE POLICY "Admins full access to tips" ON tips
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Public can INSERT evidence
CREATE POLICY "Anyone can submit evidence" ON evidence
  FOR INSERT WITH CHECK (true);

-- Public can view approved evidence
CREATE POLICY "Public can view approved evidence" ON evidence
  FOR SELECT USING (status IN ('verified'));

-- Admins full access to evidence
CREATE POLICY "Admins full access to evidence" ON evidence
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Public timeline events
CREATE POLICY "Public timeline" ON timeline_events
  FOR SELECT USING (is_public = true);

-- Admin full timeline access
CREATE POLICY "Admins full timeline" ON timeline_events
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Verified sightings are public
CREATE POLICY "Public sightings" ON sightings
  FOR SELECT USING (verified = true);

-- Admin full sighting access
CREATE POLICY "Admins full sightings" ON sightings
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
  );

-- Search zones public read
CREATE POLICY "Public search zones" ON search_zones
  FOR SELECT USING (true);

-- Weather public read
CREATE POLICY "Public weather" ON weather_snapshots
  FOR SELECT USING (true);

-- Transit public read
CREATE POLICY "Public transit" ON transit_snapshots
  FOR SELECT USING (true);

-- ============================================
-- TRIGGERS - Auto-update timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tips_updated_at BEFORE UPDATE ON tips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER evidence_updated_at BEFORE UPDATE ON evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sightings_updated_at BEFORE UPDATE ON sightings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER search_zones_updated_at BEFORE UPDATE ON search_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTO-POPULATE location_point from lat/lng
-- ============================================

CREATE OR REPLACE FUNCTION set_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tips_set_point BEFORE INSERT OR UPDATE ON tips
  FOR EACH ROW EXECUTE FUNCTION set_location_point();

CREATE TRIGGER evidence_set_point BEFORE INSERT OR UPDATE ON evidence
  FOR EACH ROW EXECUTE FUNCTION set_location_point();

CREATE TRIGGER sightings_set_point BEFORE INSERT OR UPDATE ON sightings
  FOR EACH ROW EXECUTE FUNCTION set_location_point();

CREATE TRIGGER timeline_set_point BEFORE INSERT OR UPDATE ON timeline_events
  FOR EACH ROW EXECUTE FUNCTION set_location_point();

-- ============================================
-- SEED: Known case data
-- ============================================

INSERT INTO timeline_events (event_type, event_date, title, description, latitude, longitude, location_description, is_public, is_pinned, source) VALUES
  ('other', '2026-03-20 20:00:00-04', 'Brittany exits moving vehicle', 'Per husband Fernando Garip: Brittany was in a panicked state, jumped from moving car, threw phone into bushes, ran off on foot.', 40.8715, -73.5320, 'Oyster Bay / East Norwich area', true, true, 'News 12 Long Island'),
  ('sighting', '2026-03-20 20:14:00-04', 'Last confirmed sighting — McCouns Lane', 'Last seen on foot on McCouns Lane near the East Norwich / Oyster Bay border.', 40.8728, -73.5340, 'McCouns Lane, East Norwich', true, true, 'Nassau County PD'),
  ('police_action', '2026-03-20 20:30:00-04', 'Reported missing to police', 'Missing persons report filed with Nassau County PD. 16 minutes after last sighting.', 40.8715, -73.5320, 'Oyster Bay', true, true, 'Nassau County PD'),
  ('search_effort', '2026-03-20 21:00:00-04', 'Helicopter and drone search launched', 'Nassau County PD deploys helicopter and drones. Multiple deployments continue through the weekend.', 40.8715, -73.5320, 'Oyster Bay / East Norwich area', true, false, 'News reports'),
  ('media', '2026-03-22 12:00:00-04', 'News 12 coverage — family pleads for help', 'Family asks public to check Ring cameras, search yards, garages, sheds. Watch near train lines and stations.', 40.8715, -73.5320, 'Oyster Bay', true, false, 'News 12 Long Island');

INSERT INTO sightings (sighting_date, description, confidence, latitude, longitude, location_point, location_description, clothing_description, demeanor, verified, verification_notes) VALUES
  ('2026-03-20 20:14:00-04', 'Last confirmed sighting on McCouns Lane on foot', 'confirmed', 40.8728, -73.5340, ST_SetSRID(ST_MakePoint(-73.5340, 40.8728), 4326), 'McCouns Lane, East Norwich / Oyster Bay border', 'Black pants, black jacket with fur collar', 'Panicked / in crisis', true, 'Per Nassau County PD missing persons report');
