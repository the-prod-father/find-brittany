import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evidence_id, file_url } = body;

    if (!evidence_id || !file_url) {
      return NextResponse.json(
        { error: "evidence_id and file_url required" },
        { status: 400 }
      );
    }

    // Fetch the video file
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = fileRes.headers.get("content-type") || "video/mp4";

    // Send entire video to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      {
        text: `You are a detective analyzing security camera footage for a missing persons investigation. Watch this entire video carefully.

Write a brief incident report with:

1. **OVERVIEW** — One sentence: what is this footage showing (location type, time of day, camera angle)

2. **ACTIVITY LOG** — For each notable moment, write:
   [timestamp] What happened
   Only log moments where something actually happens (person appears, vehicle passes, movement, sound). Skip empty/static moments.

3. **PERSONS** — For each person visible:
   - Approximate build, clothing, hair
   - Direction of movement
   - Behavior (walking, running, standing, looking around)
   - Could this be the missing person? (32F, 5'7", 140 lbs, brown hair, glasses, black jacket with fur collar)

4. **VEHICLES** — Any vehicles: type, color, direction, license plate if visible

5. **INVESTIGATIVE NOTES** — What's important here? What should investigators follow up on?

Be concise. Write like detective notes, not an essay. If nothing notable happens, say "No significant activity observed."`,
      },
    ]);

    const analysis = result.response.text();

    // Save to evidence
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("evidence")
      .select("reviewer_notes")
      .eq("id", evidence_id)
      .single();

    // Replace any old frame analysis, keep transcription
    let notes = existing?.reviewer_notes || "";
    // Remove old frame-by-frame analysis if present
    const transcriptIdx = notes.indexOf("--- AUDIO TRANSCRIPTION ---");
    if (transcriptIdx > -1) {
      notes = analysis + "\n" + notes.substring(transcriptIdx);
    } else {
      notes = analysis;
    }

    await supabase
      .from("evidence")
      .update({ reviewer_notes: notes, updated_at: new Date().toISOString() })
      .eq("id", evidence_id);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Video analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
