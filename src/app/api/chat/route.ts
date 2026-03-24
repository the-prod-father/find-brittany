import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";
import { CASE_INFO } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(data: {
  timeline: Record<string, unknown>[];
  sightings: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
  tips: Record<string, unknown>[];
}) {
  const info = CASE_INFO;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const daysMissing = Math.floor((Date.now() - new Date("2026-03-20T20:14:00-04:00").getTime()) / 86400000);

  let prompt = `You are an AI investigative analyst for an active missing persons case. You have access to ALL known data. Your job: answer questions, identify patterns, suggest concrete next steps, and highlight gaps. Be direct and actionable — this is a real, active investigation.

## Case Summary
**Subject:** ${info.subject.name}
- DOB: ${info.subject.dob} (Age ${info.subject.age})
- ${info.subject.height}, ${info.subject.weight}, ${info.subject.hair} hair, ${info.subject.eyes} eyes
- Last wearing: ${info.subject.lastWearing}

**Disappearance:** ${info.disappearance.date} at ${info.disappearance.time}
- Last seen: ${info.disappearance.lastSeenLocation}
- Coordinates: ${info.disappearance.lastSeenCoords.lat}, ${info.disappearance.lastSeenCoords.lng}
- Circumstances: ${info.disappearance.circumstances}
- Reported to police at ${info.disappearance.reportedTime}

**Today:** ${today} — Day ${daysMissing} missing
**Contacts:** Nassau County PD: ${info.contacts.police.phone} | ${info.contacts.husband.name}: ${info.contacts.husband.phone} | ${info.contacts.father.name}: ${info.contacts.father.phone}

## Key Locations
- McCouns Lane (40.8728, -73.5340) — LAST CONFIRMED SIGHTING
- Ivy Street, Oyster Bay 11771 (40.8705, -73.5310) — listed on missing poster
- Oyster Bay LIRR Station (40.8660, -73.5330) — 0.4 mi from last seen
- Mill Pond / Beekman Beach (40.8645, -73.5290) — waterway south
- Theodore Roosevelt Memorial Park (40.8680, -73.5370) — wooded/waterfront
- Oyster Bay Harbor (40.8630, -73.5360) — harbor area
- Commander Oils / boat lots area — industrial/commercial south of downtown

## Walking Speed Analysis (from last seen at 8:14 PM)
- Walking speed: ~5 km/h (3.1 mph)
- By 8:30 PM (16 min): ~1.3 km radius
- By 9:00 PM (46 min): ~3.8 km radius
- By 10:00 PM (106 min): ~8.8 km radius
- By midnight (226 min): ~18.8 km radius

`;

  // Timeline events
  prompt += `## Timeline Events (${data.timeline.length} records)\n`;
  for (const e of data.timeline) {
    prompt += `- [${e.event_date}] [${e.event_type}] ${e.title}\n`;
    if (e.description) prompt += `  ${e.description}\n`;
    if (e.location_description) prompt += `  Location: ${e.location_description}`;
    if (e.latitude) prompt += ` (${e.latitude}, ${e.longitude})`;
    prompt += "\n";
    if (e.source) prompt += `  Source: ${e.source}\n`;
    if (e.is_pinned) prompt += `  ⚠️ PINNED — Key event\n`;
  }

  // Sightings
  prompt += `\n## Sightings (${data.sightings.length} records)\n`;
  for (const s of data.sightings) {
    prompt += `- [${s.sighting_date}] ${s.description}\n`;
    prompt += `  Confidence: ${s.confidence} | Verified: ${s.verified}\n`;
    if (s.location_description) prompt += `  Location: ${s.location_description} (${s.latitude}, ${s.longitude})\n`;
    if (s.clothing_description) prompt += `  Clothing: ${s.clothing_description}\n`;
    if (s.demeanor) prompt += `  Demeanor: ${s.demeanor}\n`;
    if (s.direction_of_travel) prompt += `  Direction: ${s.direction_of_travel}\n`;
  }

  // Evidence
  prompt += `\n## Evidence (${data.evidence.length} records)\n`;
  for (const e of data.evidence) {
    const hasGPS = e.latitude && e.longitude;
    const hasDate = !!e.capture_date;
    let score = 10;
    if (e.file_url) score += 30;
    if (hasGPS) score += 25;
    if (hasDate) score += 20;
    if ((e.mime_type as string)?.startsWith("video")) score += 10;
    score = Math.min(score, 100);

    prompt += `- [${e.capture_date || "NO TIMESTAMP"}] ${e.title} (${e.evidence_type})\n`;
    prompt += `  Status: ${e.status} | Quality: ${score}/100 | GPS: ${hasGPS ? `${e.latitude}, ${e.longitude}` : "MISSING"}\n`;
    if (e.location_description) prompt += `  Location: ${e.location_description}\n`;
    if (e.description) prompt += `  Description: ${e.description}\n`;
    if (e.reviewer_notes) prompt += `  Reviewer notes: ${e.reviewer_notes}\n`;
  }

  // Tips
  prompt += `\n## Tips (${data.tips.length} records)\n`;
  for (const t of data.tips) {
    prompt += `- [${t.tip_date || t.created_at}] ${t.title}\n`;
    prompt += `  ${t.description}\n`;
    prompt += `  Status: ${t.status} | Urgency: ${t.urgency}\n`;
    if (t.location_description) prompt += `  Location: ${t.location_description}`;
    if (t.latitude) prompt += ` (${t.latitude}, ${t.longitude})`;
    prompt += "\n";
  }

  prompt += `
## Instructions
1. Always reference specific data points with dates, times, and locations.
2. Include GPS coordinates when discussing locations.
3. Suggest concrete actions: which cameras to check, which neighbors to canvass, which areas to search.
4. Use the walking speed analysis to estimate where she could be at different times.
5. Flag discrepancies between data sources.
6. Note missing GPS or timestamps as investigation gaps.
7. When asked "what should we do next", prioritize by likely impact.
8. Consider the industrial/commercial areas (Commander Oils, boat lots) south of downtown as potential areas of interest.
9. Consider LIRR train schedules — could she have gotten on a train?
10. Be direct. Every minute matters.`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createServiceClient();

    // Fetch ALL case data in parallel
    const [timelineRes, sightingsRes, evidenceRes, tipsRes] = await Promise.all([
      supabase.from("timeline_events").select("*").order("event_date", { ascending: true }),
      supabase.from("sightings").select("*").order("sighting_date", { ascending: true }),
      supabase.from("evidence").select("*").order("created_at", { ascending: false }),
      supabase.from("tips").select("*").order("created_at", { ascending: false }),
    ]);

    const systemPrompt = buildSystemPrompt({
      timeline: timelineRes.data || [],
      sightings: sightingsRes.data || [],
      evidence: evidenceRes.data || [],
      tips: tipsRes.data || [],
    });

    // Build messages array with history
    const messages: { role: "user" | "assistant"; content: string }[] = [];
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) { // Keep last 10 messages for context
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    // Stream response
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
