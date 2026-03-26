# Current Context

**Last Updated:** 2026-03-25
**Project:** Find Brittany — Missing Persons Investigation Platform
**Branch:** main

## Active Work Streams

| Stream | Status | Last Touched | Notes |
|--------|--------|-------------|-------|
| Large file upload | Blocked | 2026-03-25 | TUS protocol works but Supabase project limit rejecting 192MB files. Need to increase in dashboard. |
| Public evidence collection | Active | 2026-03-25 | Facebook post live. 5 evidence items (all from Gavin). Waiting for community uploads. |
| AI video analysis | Done | 2026-03-25 | Gemini 2.0 Flash full-video, auto-runs on view |
| Audio transcription | Done | 2026-03-25 | Whisper, .mov→.mp4 workaround, auto-runs |
| Investigation map | Done | 2026-03-25 | Satellite, AI chat, click-to-query, evidence markers |
| Canvass checklist | Done | 2026-03-25 | DB table + API + UI in command center |
| News monitoring | Active | 2026-03-25 | Hourly cron, wallet+keys found on Florence Ave |

## Quick Status

| Area | State | Details |
|------|-------|---------|
| Build | ✓ Clean | Next.js 16.2.1, deploys on push |
| Deploy | ✓ Live | find-brittany.vercel.app |
| Database | ✓ Healthy | Supabase Pro, 10 tables |
| Evidence | 5 items | All from Gavin, 0 public submissions yet |
| Cron | ✓ Running | Hourly news check |

## Known Issues

- Supabase project-level upload limit blocking files >50MB (TUS also blocked)
- Google Places Autocomplete deprecation warning (still works)
- Map tilt/heading not supported on raster maps (warning only)

## Next Priorities

1. Fix upload size limit (Supabase dashboard → Storage settings)
2. Upload Gailview.MP4 evidence once limit is fixed
3. Monitor for public evidence submissions
4. Canvass Florence Avenue area (wallet/keys found)
5. Obtain LIRR station camera footage

## Pending Questions

- How big is the Gailview.MP4 file exactly?
- Has the Facebook post gotten engagement/shares?
