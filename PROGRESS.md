# Progress Log

Session history for this project. Most recent session first.

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
