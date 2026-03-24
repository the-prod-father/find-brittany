import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("frame") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "frame is required (image file)" },
        { status: 400 }
      );
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
      "image/jpeg";
    if (file.type === "image/png") mediaType = "image/png";
    else if (file.type === "image/webp") mediaType = "image/webp";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `You are analyzing an image or video frame from a security/Ring camera for a missing persons investigation.

Extract ALL of the following information visible in the image. Return ONLY valid JSON, no other text:

{
  "timestamp": "ISO 8601 datetime if visible in the frame overlay (e.g., 2026-03-20T20:14:00), or null",
  "date": "date if visible (e.g., 03/20/2026), or null",
  "time": "time if visible (e.g., 8:14 PM), or null",
  "camera_name": "camera name/label if visible in overlay, or null",
  "location_text": "any address, street name, or location text visible, or null",
  "people_visible": true/false,
  "people_count": number or 0,
  "people_description": "description of any people visible (clothing, direction of movement, behavior), or null",
  "vehicles_visible": true/false,
  "vehicle_description": "description of any vehicles (color, type, direction), or null",
  "environment": "description of the scene (street, yard, driveway, etc.)",
  "lighting": "daylight/dusk/night/artificial",
  "weather_visible": "any visible weather conditions, or null",
  "notable_details": "any other investigatively relevant details"
}`,
            },
          ],
        },
      ],
    });

    // Parse the JSON response
    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const analysis = JSON.parse(jsonStr);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
