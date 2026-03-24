# Find Brittany — Claude Code Build Prompt

Copy everything below the line into Claude Code to continue this build.

---

## Context

I'm building a public-facing missing persons investigation tracker app called **Find Brittany**. This is for a real, active case — Brittany Kritis-Garip, 32, has been missing since March 20, 2026 from Oyster Bay, Long Island, NY.

I'm the founder of Why Not Us Labs (whynotus.ai). I previously built Evidence.com at Axon and scaled it into the digital evidence management platform it is today. I'm bringing that same evidence-management DNA to this project.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript, Tailwind CSS v4)
- **Backend:** Supabase (Postgres + PostGIS, Auth, Storage, RLS)
- **Deployment:** Vercel (separate project from my other apps, but same Supabase instance)
- **Maps:** Leaflet + OpenStreetMap (dark tiles via CARTO)
- **Domain:** Will be deployed as `findbrittany.vercel.app` or `find.whynotus.ai`

## What's Already Built

The project scaffold is at `~/Dev/find-brittany/`. Here's what exists:

### Database Schema (`supabase/migrations/001_initial_schema.sql`)
- **tips** — Public tip submissions with moderation (status: pending/under_review/verified/dismissed/critical)
- **evidence** — File uploads linked to tips, with chain of custody tracking
- **sightings** — Verified/reported sightings with lat/lng, confidence levels, demeanor notes
- **timeline_events** — Master case timeline (sightings, tips, police actions, search efforts, media)
- **search_zones** — GeoJSON polygons for active search areas
- **weather_snapshots** — Weather conditions at key times/locations
- **transit_snapshots** — LIRR train schedules at key times
- Full PostGIS integration (auto-populates geometry from lat/lng)
- Row Level Security enabled on all tables
- Seed data with the known timeline events

### Frontend Pages
- `/` — Homepage with case info, day counter, "How You Can Help" section, contact info
- `/submit` — Full tip submission form with anonymous option, file upload, location fields
- `/map` — Interactive Leaflet map (needs the MapComponent to be wired up)
- `/timeline` — Timeline view (needs to be completed)
- `/admin` — Moderation dashboard with tabs (Tips, Evidence, Sightings, Timeline), stats bar, review actions

### API Routes
- `POST /api/tips` — Submit a tip
- `GET /api/tips` — Get verified tips (or all with `?all=true`)
- `PATCH /api/tips/[id]` — Update tip status/notes
- `POST /api/evidence` — Upload evidence file
- `GET /api/evidence` — Get evidence (optionally filtered by `?tip_id=`)
- `GET /api/timeline` — Get public timeline events
- `POST /api/timeline` — Create timeline event (admin)
- `GET /api/sightings` — Get verified sightings for map
- `POST /api/sightings` — Create sighting from verified tip (admin)

### Lib
- `src/lib/supabase.ts` — Client + service role client
- `src/lib/types.ts` — Full TypeScript types + CASE_INFO constants

### Config
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` — All configured
- `.env.local.example` — Template for env vars

## What Needs to Be Done

### Priority 1 — Get It Building & Deployable
1. Run `npm run build` and fix any TypeScript/build errors
2. Make sure all pages render correctly
3. Ensure the `.env.local.example` covers all needed vars
4. Wire up Supabase — run the migration against my Supabase project
5. Create Supabase storage bucket "evidence" for file uploads
6. Deploy to Vercel

### Priority 2 — Complete Core Features
1. **Map Page** — The `MapComponent.tsx` exists but may need fixes. It should:
   - Show sightings from the database as pins (color-coded by confidence)
   - Show search zone polygons
   - Show the last known position with a pulsing red marker
   - Show search radius rings (0.25mi, 0.5mi, 1mi)
   - Toggle between dark, satellite, and street map layers
   - Allow clicking the map to get lat/lng (for tip submission location picker)
   - Be responsive on mobile

2. **Timeline Page** — Build a vertical timeline view:
   - Fetch from `/api/timeline`
   - Each event shows: date/time, title, description, location, source
   - Color-code by event type (sighting=red, police_action=blue, search_effort=green, media=purple, tip=yellow)
   - Pinned events get highlighted
   - Filter by event type

3. **Admin Dashboard Refinements:**
   - Add Supabase auth check (redirect to login if not admin)
   - "Convert to Sighting" button should open a modal pre-filled with tip data
   - Evidence tab should show image thumbnails from Supabase storage
   - Add ability to create timeline events from admin

### Priority 3 — Integrations
1. **Weather API** — Fetch historical weather for Oyster Bay on March 20, 2026 evening:
   - OpenWeatherMap or Visual Crossing API
   - Store in weather_snapshots table
   - Display on map and timeline (sunset time, temperature, visibility, wind)

2. **LIRR/Transit** — Get train schedules for Oyster Bay station:
   - MTA GTFS data or scrape schedule
   - What trains departed Oyster Bay station between 8:00 PM - 11:00 PM on March 20?
   - Store in transit_snapshots
   - Show on timeline

3. **Geocoding** — When users submit tips with a location description but no lat/lng:
   - Use Mapbox or Google geocoding API to auto-fill coordinates
   - Show a "pin on map" option in the submit form

### Priority 4 — Polish & UX
1. Mobile-responsive everything
2. Social sharing meta tags (OG image with Brittany's photo)
3. Add a "Share" button that generates shareable links
4. Loading states and error handling on all forms
5. Rate limiting on tip submission to prevent abuse
6. Add a "Case Updates" section on the homepage for latest developments

## Case Details (For Reference)

**Subject:** Brittany Kritis-Garip
- DOB: March 3, 1994 (Age 32)
- 5'7", 140 lbs, brown hair, brown eyes
- Last wearing: black pants, black jacket with fur collar

**Disappearance:**
- Date: March 20, 2026
- ~8:00 PM: Husband Fernando Garip says she was in a "panicked state," jumped from a moving car, threw her phone into bushes, ran off on foot
- 8:14 PM: Last seen on foot on McCouns Lane (East Norwich / Oyster Bay border)
- 8:30 PM: Reported missing to Nassau County PD
- Family says she was in a "state of psychosis," may be disoriented, believes she is in danger but is "not a danger to others"

**Key Locations:**
- McCouns Lane, East Norwich (40.8728, -73.5340) — last confirmed sighting
- Ivy Street, Oyster Bay 11771 — listed on missing poster (may be home address)
- Oyster Bay LIRR Station (40.8660, -73.5330) — ~0.4 mi from last seen
- Mill Pond / Beekman Beach — waterway south of downtown
- Theodore Roosevelt Memorial Park — wooded/waterfront area

**Contacts:**
- Nassau County PD Missing Persons: 516-573-7347
- Fernando Garip (husband): (201) 638-6559
- George (father): (516) 807-1548
- Emergency: 911

**Search Efforts:**
- Nassau PD helicopter and drones deployed since Friday night
- Family urging public to check Ring cameras, search properties
- Focus on train lines and stations

## Design System

- **Background:** #0f0f1a (dark navy/black)
- **Surface:** #161625 (card backgrounds)
- **Cards:** #1c1c2e
- **Borders:** #2a2a40
- **Text Primary:** #f0f0f5
- **Text Secondary:** #8888a0
- **Alert/CTA Red:** #e94560 (also used for red-400 in Tailwind)
- **Verified Green:** #22c55e
- **Pending Yellow:** #eab308
- **Critical/Urgent Orange:** #f97316
- **Info Blue:** #3b82f6

The vibe is: serious, investigative, dark-mode, urgency. Think evidence management platform meets crisis dashboard. No playful elements — this is a real missing person.

## How to Start

```bash
cd ~/Dev/find-brittany
npm install
# Set up .env.local with your Supabase creds
npm run dev
```

Start by getting the build clean, then work through priorities in order. Ship fast.
