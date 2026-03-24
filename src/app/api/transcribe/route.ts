import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";
import { createServiceClient } from "@/lib/supabase";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 60;

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
      return NextResponse.json(
        { error: `Failed to fetch file: ${fileRes.status}` },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to File object for OpenAI
    const file = await toFile(buffer, "video.mp4", { type: "video/mp4" });

    // Send to Whisper
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const text = transcription.text || "No speech detected in this video.";
    const segments = transcription.segments || [];

    // Build transcript text
    let transcriptText = `\n\n--- AUDIO TRANSCRIPTION ---\n${text}`;

    if (segments.length > 0) {
      transcriptText +=
        "\n\nTimestamped:\n" +
        segments
          .map(
            (s: { start: number; end: number; text: string }) =>
              `[${Math.floor(s.start / 60)}:${Math.floor(s.start % 60).toString().padStart(2, "0")} - ${Math.floor(s.end / 60)}:${Math.floor(s.end % 60).toString().padStart(2, "0")}] ${s.text.trim()}`
          )
          .join("\n");
    }

    // Save to evidence
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("evidence")
      .select("reviewer_notes")
      .eq("id", evidence_id)
      .single();

    const existingNotes = existing?.reviewer_notes || "";

    await supabase
      .from("evidence")
      .update({
        reviewer_notes: existingNotes + transcriptText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", evidence_id);

    return NextResponse.json({ success: true, text, segments });
  } catch (error) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Transcription failed: ${message}` },
      { status: 500 }
    );
  }
}
