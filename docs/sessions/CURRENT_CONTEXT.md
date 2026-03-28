# Current Context

**Last Updated:** 2026-03-27
**Project:** Find Brittany — Missing Persons Investigation Platform
**Branch:** main

## Active Work Streams

| Stream | Status | Last Touched | Notes |
|--------|--------|-------------|-------|
| Cove Neck Operations | Active | 2026-03-27 | Full-viewport ops tool with AI Recon, drawing tool, 128 properties, 7 ALPR cameras, Supabase annotations |
| Auth system | Done | 2026-03-27 | Middleware gates all ops pages. Login at /cove-neck. Credentials: cnwatch / marsh-heron-47 |
| ALPR camera mapping | Done | 2026-03-27 | 7 Flock Safety cameras on map + sidebar list with details |
| Map drawing/annotations | Done | 2026-03-27 | Two-click rectangle, AI Q&A, named pins stored in Supabase |
| AI Recon | Done | 2026-03-27 | ArcGIS satellite → Gemini 2.5 Flash, detective-style briefings per property |
| Admin bar | Done | 2026-03-27 | Floating nav on all pages when authenticated |
| Large file upload | Blocked | 2026-03-25 | TUS protocol works but Supabase project limit rejecting 192MB files |
| Public evidence collection | Active | 2026-03-25 | Facebook post live. 5 evidence items. Waiting for community uploads. |
| News monitoring | Active | 2026-03-25 | Hourly cron. Wallet+keys found Florence Ave. |

## Quick Status

| Area | State | Details |
|------|-------|---------|
| Build | Clean | Next.js, deploys on push |
| Deploy | Live | find-brittany.vercel.app |
| Database | Healthy | Supabase Pro, 11 tables (added map_annotations), 128 canvass properties |
| Auth | Live | Middleware + /cove-neck login. All ops pages protected. |
| Cove Neck Ops | Live | Full-viewport map + sidebar, 128 addresses, 7 cameras, drawing tool, AI Recon |
| Gemini | Working | gemini-2.5-flash (2.0 deprecated) |
| Evidence | 5 items | All from Gavin, 0 public submissions yet |
| Cron | Running | Hourly news check |

## Recent Commits

- `499baa8` Annotations → Supabase — persistent, shared across users
- `f3ddf2b` Named locations — name your pins, shown on map labels
- `ec611df` Figma-style floating toolbar — bottom center of map
- `8323eb5` Map drawing tool — circle areas, ask AI, pin annotations
- `3dacdd7` AI Recon — detective-style prompt + proper text rendering
- `059501c` Fix duplicate seeding — one-time seed with race condition guard
- `beb5dbc` Fix Gemini — upgrade to gemini-2.5-flash (2.0 deprecated)
- `3de3a98` AI Recon — Gemini satellite analysis per property
- `1efedfc` Change boundary to cyan — colorblind-safe (red-green)

## Known Issues

- Supabase project-level upload limit blocking files >50MB
- Google Static Maps API not enabled (mitigated — using interactive map + ArcGIS for AI)
- Google Places Autocomplete deprecation warning (still works)
- Existing localStorage annotations won't migrate to Supabase (need to re-pin)

## Next Priorities

1. Share credentials with Chief Lack and demo the ops tool
2. Test drawing tool + AI analysis on iPad with Apple Pencil
3. Build annotation search/filter in sidebar
4. Investigate Flock Safety ALPR data access through law enforcement
5. Fix Supabase upload size limit
6. Upload Gailview.MP4 evidence
7. Monitor public evidence submissions

## Pending Questions

- What signal does Chief Lack have that Brittany is in Cove Neck? (Sighting? Tip? Camera?)
- Does NCPD have Flock Safety ALPR access for Cove Neck entrance camera?
- Has the Facebook post gotten engagement/shares?
