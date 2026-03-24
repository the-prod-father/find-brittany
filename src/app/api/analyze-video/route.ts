import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Analyze a single frame with Claude Vision
async function analyzeFrame(
  base64: string,
  frameIndex: number,
  totalFrames: number,
  timestampSeconds: number
) {
  const minutes = Math.floor(timestampSeconds / 60);
  const seconds = Math.floor(timestampSeconds % 60);
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64 },
          },
          {
            type: "text",
            text: `This is frame ${frameIndex + 1} of ${totalFrames} from a security camera video at timestamp ${timeLabel}. This is part of a missing persons investigation.

Describe in 2-3 sentences: What do you see? Are there any people visible? What are they doing? Any vehicles? What direction is anyone moving? Note any changes from what might have been in previous frames. Include any text overlays (timestamps, camera names).

Be specific and factual. If you see a person, describe their clothing, size, and movement.`,
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  return {
    frame_index: frameIndex,
    timestamp_seconds: timestampSeconds,
    timestamp_label: timeLabel,
    description: content.type === "text" ? content.text : "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { evidence_id, frames } = body;

    // frames is an array of { base64: string, timestamp_seconds: number }
    if (!evidence_id || !frames || !Array.isArray(frames) || frames.length === 0) {
      return NextResponse.json(
        { error: "evidence_id and frames array required" },
        { status: 400 }
      );
    }

    const totalFrames = frames.length;
    const results = [];

    // Analyze frames sequentially (to avoid rate limits)
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      try {
        const analysis = await analyzeFrame(
          frame.base64,
          i,
          totalFrames,
          frame.timestamp_seconds
        );
        results.push(analysis);
      } catch (err) {
        console.error(`Frame ${i} analysis failed:`, err);
        results.push({
          frame_index: i,
          timestamp_seconds: frame.timestamp_seconds,
          timestamp_label: `${Math.floor(frame.timestamp_seconds / 60)}:${Math.floor(frame.timestamp_seconds % 60).toString().padStart(2, "0")}`,
          description: "Analysis failed for this frame.",
        });
      }
    }

    // Save analysis to evidence reviewer_notes
    const supabase = createServiceClient();
    const analysisText = results
      .map((r) => `[${r.timestamp_label}] ${r.description}`)
      .join("\n\n");

    await supabase
      .from("evidence")
      .update({
        reviewer_notes: analysisText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", evidence_id);

    return NextResponse.json({
      success: true,
      frames_analyzed: results.length,
      analysis: results,
    });
  } catch (error) {
    console.error("Video analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
