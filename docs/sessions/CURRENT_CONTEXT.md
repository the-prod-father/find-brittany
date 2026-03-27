# Current Context

**Last Updated:** 2026-03-27
**Project:** Find Brittany — Missing Persons Investigation Platform
**Branch:** main

## Active Work Streams

| Stream | Status | Last Touched | Notes |
|--------|--------|-------------|-------|
| Cove Neck Operations | Active | 2026-03-27 | Full-viewport ops tool live. 121 properties seeded. Auth-gated. Chief Lack coordination pending. |
| Auth system | Done | 2026-03-27 | Middleware gates all ops pages. Login at /cove-neck. Credentials: cnwatch / marsh-heron-47 |
| ALPR camera mapping | Done | 2026-03-27 | 7 Flock Safety cameras on map. Chokepoint camera at CN Rd entrance. |
| Admin bar | Done | 2026-03-27 | Floating nav on all pages when authenticated |
| Large file upload | Blocked | 2026-03-25 | TUS protocol works but Supabase project limit rejecting 192MB files |
| Public evidence collection | Active | 2026-03-25 | Facebook post live. 5 evidence items. Waiting for community uploads. |
| News monitoring | Active | 2026-03-25 | Hourly cron. Wallet+keys found Florence Ave. |

## Quick Status

| Area | State | Details |
|------|-------|---------|
| Build | Clean | Next.js, deploys on push |
| Deploy | Live | find-brittany.vercel.app |
| Database | Healthy | Supabase Pro, 10 tables, 121 canvass properties |
| Auth | Live | Middleware + /cove-neck login. All ops pages protected. |
| Cove Neck Ops | Live | Full-viewport map + sidebar, 121 addresses, 7 cameras |
| Evidence | 5 items | All from Gavin, 0 public submissions yet |
| Cron | Running | Hourly news check |

## Recent Commits

- `9bd0bd8` Cove Neck Ops full redesign — full-viewport map with sidebar
- `7d11459` Auto-seed properties + 7 ALPR camera markers on map
- `b726e7f` Admin bar + 121 real Cove Neck addresses + map zoom on click
- `4fa7052` Fix auth — trim env var whitespace
- `82ba414` Fix middleware — use Edge-compatible hash instead of Node crypto
- `9b65f1a` Cove Neck ops center — auth-gated property search for law enforcement

## Known Issues

- Supabase project-level upload limit blocking files >50MB
- Google Static Maps API not enabled (satellite thumbnails won't load — mitigated by using interactive map)
- Google Places Autocomplete deprecation warning (still works)

## Next Priorities

1. Verify Cove Neck Ops full-viewport redesign in production
2. Share credentials with Chief Lack and begin field canvass
3. Investigate Flock Safety ALPR data access through law enforcement
4. AI satellite analysis per property (Gemini on satellite imagery)
5. Fix Supabase upload size limit
6. Upload Gailview.MP4 evidence
7. Monitor public evidence submissions

## Pending Questions

- What signal does Chief Lack have that Brittany is in Cove Neck? (Sighting? Tip? Camera?)
- Does NCPD have Flock Safety ALPR access for Cove Neck entrance camera?
- Has the Facebook post gotten engagement/shares?
