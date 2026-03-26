# Session: 2026-03-24/25 — Find Brittany Investigation Platform Build

**Duration:** ~10 hours (extended session)
**Branch:** main
**Commits:** 50

## Executive Summary
Built a complete missing persons investigation platform from scratch for Brittany Kritis-Garip, missing since March 20, 2026 from Oyster Bay, Long Island. The platform enables public evidence submission (video/photo with location), AI-powered analysis (Gemini full-video, Claude Vision, Whisper transcription), an interactive satellite investigation map with AI chat, admin review tools, and a door-to-door canvass checklist. Deployed live to Vercel, shared on Facebook community groups.

## Goals & Outcomes
| Goal | Status | Notes |
|------|--------|-------|
| Clean build + deploy to Vercel | ✓ Done | find-brittany.vercel.app |
| Supabase database + storage | ✓ Done | 7 tables, PostGIS, RLS, evidence bucket |
| Public evidence upload | ✓ Done | TUS resumable upload, any file size |
| AI video analysis | ✓ Done | Gemini 2.0 Flash full-video analysis |
| Audio transcription | ✓ Done | Whisper, clickable timestamps |
| Investigation map + AI chat | ✓ Done | Satellite map, click-to-query, streaming |
| Admin review page | ✓ Done | Hidden URL, edit metadata, approve/reject |
| Timeline page | ✓ Done | Dynamic, chronological, auto-updates |
| News ingestion | ✓ Done | Hourly cron, 4 articles ingested |
| LIRR train data | ✓ Done | 3 evening trains, all stations mapped |
| Email notifications | ✓ Done | Resend, on new evidence upload |
| Large file upload (192MB+) | ◉ In Progress | TUS protocol working, Supabase project limit issue being resolved |
| OG image for social sharing | ✓ Done | Brittany's photo + NCPD badge for admin |

## Decisions Made
- **Google Maps over Leaflet**: Switched to Google Maps for Street View, 3D tilt, satellite imagery, Places autocomplete
- **Gemini over Claude for video**: Gemini 2.0 Flash can ingest entire video files natively — sees every frame vs 5 static samples
- **Light mode over dark**: User said light mode is more trustworthy for a public-facing missing person site
- **Location mandatory on upload**: Ring cameras don't embed GPS in exports, so user must provide address
- **Two user types, minimal nav**: Public sees Home + Map + Timeline + Upload. Admin gets hidden URLs for everything else
- **TUS resumable uploads**: Standard Supabase upload has hidden 50MB limit. TUS uploads in 6MB chunks, any file size
- **Direct browser → Supabase upload**: Bypasses Vercel's 4.5MB serverless body limit entirely
- **No Why Not Us Labs branding**: This is community-driven, not a product pitch

## Key Evidence Found During Session
- **Wallet + keys found** on Florence Avenue near Oyster Bay Harbor (March 23)
- **LIRR Oyster Bay train at 8:39 PM** — 25 minutes after last sighting, she could have made it
- **Ivy Street doorbell video** at 8:03 PM — 11 minutes BEFORE last confirmed sighting, timeline discrepancy
- **Websleuths thread** tracking the case with additional community analysis

## Technical Context
- **Supabase Project:** xyjcvavmkvknkefdwudn (us-east-1)
- **Vercel Team:** why-not-us-labs
- **GitHub:** the-prod-father/find-brittany
- **APIs:** Anthropic (Claude), Google (Maps + Gemini), OpenAI (Whisper), Resend (email)
- **Database:** PostgreSQL + PostGIS, 7 tables + ai_usage + chat_log + canvass_locations

## Admin URLs (not public)
- `/review/bk-ops-7347` — Evidence review + AI query
- `/cmd-center-7347` — Full map + canvass checklist + AI chat
- `/case-files-7347` — Evidence gallery
- `/intel-ops-7347` — Data source comparison

## Issues Encountered
- **Ring GPS**: Ring doesn't embed GPS in exported videos. Fixed with Google Places address autocomplete.
- **Vercel 413**: Body size limit. Fixed with direct browser-to-Supabase upload.
- **Supabase 400 on filenames**: Spaces/special chars in filenames. Fixed with sanitization.
- **Whisper rejects .mov**: Renamed to .mp4 with audio/mp4 mime type.
- **Supabase upload size limit**: Standard upload capped at ~50MB. Switched to TUS resumable protocol.
- **Dark mode accessibility**: Green-on-green, low contrast text. Fixed with full light mode conversion.

## User Preferences Noted
- Ship fast, iterate, don't over-plan
- Simple, frictionless, "lovable and humanable"
- Mobile-first — most users will be on phones
- Chain of custody is sacred — never modify original evidence
- No branding — this is about finding Brittany, not promoting a company
- Detective-style AI notes — short, bullet points, no paragraphs
- Let AI do the heavy lifting, minimal manual UI

## Next Priorities
1. **Fix large file upload** — Supabase project-level upload limit needs to be increased in dashboard
2. **Get more public submissions** — Facebook post is live, waiting for community response
3. **Analyze new evidence** — Gailview.MP4 needs to be uploaded once limit is fixed
4. **Canvass Florence Avenue area** — wallet/keys found there, critical area
5. **LIRR station cameras** — no footage obtained yet from the station
6. **Private investigator coordination** — GoFundMe is raising funds for PI
