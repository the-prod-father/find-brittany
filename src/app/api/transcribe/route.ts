import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evidence_id, file_url } = body;

    if (!evidence_id || !file_url) {
      return NextResponse.json({ error: "evidence_id and file_url required" }, { status: 400 });
    }

    // Fetch video as a Response and pipe to Whisper
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) {
      return NextResponse.json({ error: `Fetch failed: ${fileRes.status}` }, { status: 500 });
    }

    // Get the blob and create a File
    const blob = await fileRes.blob();
    const file = new File([blob], "video.mp4", { type: "video/mp4" });

    // Send to Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    const text = transcription.text || "No speech detected.";

    // Save to evidence
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("evidence")
      .select("reviewer_notes")
      .eq("id", evidence_id)
      .single();

    const notes = (existing?.reviewer_notes || "") + `\n\n--- AUDIO TRANSCRIPTION ---\n${text}`;

    await supabase
      .from("evidence")
      .update({ reviewer_notes: notes, updated_at: new Date().toISOString() })
      .eq("id", evidence_id);

    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
