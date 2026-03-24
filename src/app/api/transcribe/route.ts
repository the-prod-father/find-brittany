import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Fetch the video/audio file
    const fileRes = await fetch(file_url);
    const blob = await fileRes.blob();
    const file = new File([blob], "audio.mp4", { type: blob.type });

    // Send to Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Save transcription to evidence
    const supabase = createServiceClient();

    // Get existing reviewer_notes and append
    const { data: existing } = await supabase
      .from("evidence")
      .select("reviewer_notes")
      .eq("id", evidence_id)
      .single();

    const existingNotes = existing?.reviewer_notes || "";
    const transcriptText = `\n\n--- AUDIO TRANSCRIPTION ---\n${
      transcription.text || "No speech detected."
    }${
      transcription.segments
        ? "\n\nTimestamped:\n" +
          transcription.segments
            .map(
              (s: { start: number; end: number; text: string }) =>
                `[${Math.floor(s.start / 60)}:${Math.floor(s.start % 60).toString().padStart(2, "0")} - ${Math.floor(s.end / 60)}:${Math.floor(s.end % 60).toString().padStart(2, "0")}] ${s.text}`
            )
            .join("\n")
        : ""
    }`;

    await supabase
      .from("evidence")
      .update({
        reviewer_notes: existingNotes + transcriptText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", evidence_id);

    return NextResponse.json({
      success: true,
      text: transcription.text,
      segments: transcription.segments,
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
