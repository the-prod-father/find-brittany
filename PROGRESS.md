# Progress Log

Session history for this project. Most recent session first.

---

## Session: 2026-03-27 — Cove Neck Ops Enhancements
**Duration:** ~2.5h | **Commits:** 12 | **Branch:** main

### What Was Built
- AI Recon: detective-style satellite analysis per property (ArcGIS → Gemini 2.5 Flash)
- Map drawing tool: two-click rectangles, AI Q&A on any area, named persistent pins
- Figma-style floating toolbar (Pan / Draw / Pins) at bottom center of map
- ALPR camera list in sidebar with details and Street View links
- Supabase `map_annotations` table for shared annotation persistence
- Colorblind-safe boundary (cyan), mobile optimization, ReactMarkdown rendering

### Key Fixes
- Gemini 2.0-flash deprecated → upgraded to 2.5-flash
- Duplicate seeding race condition (384→128 records cleaned)
- Property selection from camera filter now works properly

### Decisions
- Satellite (top-down) over 3D for AI analysis — clearest property layout
- Detective-style plain language over structured markdown briefings
- ArcGIS World Imagery for satellite (free, no API key)
- Named annotations in Supabase over localStorage (shared across users)

### Key Files Changed
- `src/app/cove-neck-ops-7347/page.tsx` — Drawing tool, toolbar, camera list, AI Recon (+820 lines)
- `src/app/api/analyze-property/route.ts` — NEW: satellite → Gemini analysis
- `src/app/api/annotations/route.ts` — NEW: annotation CRUD
- `src/app/api/analyze-video/route.ts` — Gemini model upgrade

### Commits
- `499baa8` Annotations → Supabase
- `f3ddf2b` Named locations
- `ec611df` Figma-style floating toolbar
- `8323eb5` Map drawing tool
- `3dacdd7` Detective-style prompt + markdown rendering
- `059501c` Fix duplicate seeding
- `beb5dbc` Fix Gemini 2.5 upgrade
- `3de3a98` AI Recon feature
- `1efedfc` Colorblind-safe boundary

### Next Priorities
1. Demo tool to Chief Lack
2. Test iPad drawing with Apple Pencil
3. Annotation search/filter in sidebar
4. Flock ALPR data access
5. Fix Supabase upload limit

---

## Session: 2026-03-26 — Cove Neck Operations Center
**Duration:** ~3h | **Commits:** 6 | **Branch:** main

### What Was Built
- Auth-gated operations center for law enforcement (middleware + login at /cove-neck)
- Full-viewport Cove Neck Ops page: satellite map + sidebar with 121 real property addresses
- 7 Flock Safety ALPR camera locations mapped from OpenStreetMap
- Inline Street View, map type switching (Satellite/Road/Terrain/3D), camera toggle
- 13-item search checklist per property with real-time sync
- Floating admin bar on all pages when authenticated
- Operations Hub linking all admin pages
- Strategic search plan for Chief Lack call (chokepoint, thermal drone, K9, behavioral considerations)

### Key Intelligence
- Chief Lack says Brittany may be in Cove Neck ("lots of hiding places")
- Flock Safety ALPR camera at Cove Neck Road entrance — critical chokepoint
- 121 properties identified across 7 streets (Cove Neck Rd, Sagamore Hill Rd, Tennis Court Rd, Gracewood Ct, Elfland Ct, Valley Rd, Coopers Bluff Ln)

### Decisions
- Shared password auth over Supabase Auth (field usability for police)
- OpenStreetMap Overpass API for address data (Google APIs not enabled)
- Full-viewport map layout over scrolling cards (Google Maps-style UX)
- Auto-seed properties on first visit (zero friction)

### Key Files Changed
- `src/app/cove-neck-ops-7347/page.tsx` — Full-viewport ops tool
- `src/middleware.ts` — Auth gate for all admin pages
- `src/app/cove-neck/page.tsx` — Login + Operations Hub
- `src/components/AdminBar.tsx` — Floating admin nav

### Commits
- `9bd0bd8` Cove Neck Ops full redesign — full-viewport map with sidebar
- `7d11459` Auto-seed properties + 7 ALPR camera markers on map
- `b726e7f` Admin bar + 121 real Cove Neck addresses + map zoom on click
- `4fa7052` Fix auth — trim env var whitespace
- `82ba414` Fix middleware — use Edge-compatible hash instead of Node crypto
- `9b65f1a` Cove Neck ops center — auth-gated property search for law enforcement

### Next Priorities
1. Verify full-viewport redesign in production
2. Share credentials with Chief Lack for field canvass
3. Investigate Flock Safety ALPR data access
4. AI satellite analysis per property
5. Fix Supabase upload size limit

---

## Session: 2026-03-24/25 — Full Platform Build
**Duration:** ~10h | **Commits:** 50 | **Branch:** main

### What Was Built
- Complete investigation platform from zero to deployed
- Public: Home → Investigation Map → Timeline → Upload Evidence
- Admin: Evidence review, AI query, canvass checklist, command center
- AI: Gemini video analysis, Claude case chat, Whisper transcription
- Database: 10 tables with PostGIS, RLS, triggers
- Evidence upload with EXIF extraction, AI analysis, address autocomplete
- LIRR train data, news ingestion, email notifications
- OG images for social sharing (public + admin)

### Key Evidence
- Wallet + keys found Florence Avenue (March 23)
- LIRR 8:39 PM train — 25 min after last sighting
- Ivy Street doorbell video at 8:03 PM — timeline discrepancy
- 5 video evidence items uploaded and analyzed

### Decisions
- Google Maps over Leaflet (Street View, 3D, Places)
- Gemini over Claude for video (native video ingestion)
- Light mode (trustworthiness)
- TUS resumable uploads (chain of custody, any file size)
- Two user types: public (upload) + admin (review/investigate)

### Next Priorities
1. Fix Supabase upload size limit for large files
2. Upload Gailview.MP4 evidence
3. Monitor public submissions from Facebook post
4. Canvass Florence Avenue area
5. LIRR station cameras

---
