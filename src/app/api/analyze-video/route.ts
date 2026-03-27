import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from "@/lib/supabase";
import { trackUsage } from "@/lib/track-usage";

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

    const startTime = Date.now();

    // Fetch the video file
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 });
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = fileRes.headers.get("content-type") || "video/mp4";

    // Send entire video to Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      {
        text: `Watch this security camera video. Missing person case.

Subject: Female, 32, 5'7", 140 lbs, brown hair, glasses, black jacket with fur collar.

Reply in this EXACT format only:

**Camera:** [what camera/angle, time of day visible on overlay]

**Activity:**
- [time] [what happened — one line max]
- [time] [what happened]
(only list moments with actual movement or activity. skip dead time.)

**People:** [describe each person: build, clothing, direction. or "None visible"]

**Vehicles:** [type, color, direction. or "None"]

**Match check:** [could anyone in this video be the missing person? yes/no and why]

**Key finding:** [one sentence — the single most important thing from this video]

Keep it SHORT. No paragraphs. No filler. Bullet points only.`,
      },
    ]);

    const analysis = result.response.text();
    const usage = result.response.usageMetadata;

    // Track usage
    trackUsage({
      service: "gemini",
      model: "gemini-2.5-flash",
      endpoint: "/api/analyze-video",
      evidence_id,
      input_tokens: usage?.promptTokenCount || Math.ceil(base64.length / 4),
      output_tokens: usage?.candidatesTokenCount || Math.ceil(analysis.length / 4),
      duration_ms: Date.now() - startTime,
    });

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
