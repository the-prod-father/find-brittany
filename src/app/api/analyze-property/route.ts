import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || "").trim());

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, address } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }

    // Fetch satellite image from ArcGIS World Imagery (free, no API key needed)
    const pad = 0.001;
    const bbox = `${longitude - pad},${latitude - pad * 0.75},${longitude + pad},${latitude + pad * 0.75}`;
    const imageUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=640,480&format=jpg&f=image`;

    let base64Image: string;
    try {
      const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (!imageRes.ok) {
        console.error("ArcGIS fetch failed:", imageRes.status, imageRes.statusText);
        return NextResponse.json({ error: "Failed to fetch satellite image" }, { status: 502 });
      }
      const imageBuffer = await imageRes.arrayBuffer();
      base64Image = Buffer.from(imageBuffer).toString("base64");
      console.log("Satellite image fetched:", base64Image.length, "base64 chars");
    } catch (imgErr) {
      console.error("Image fetch error:", imgErr);
      return NextResponse.json({ error: "Satellite image fetch timed out" }, { status: 504 });
    }

    // Send to Gemini for analysis
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `You are a detective surveilling a property from overhead during a missing persons search. A disoriented woman has been missing 7 days in this area (Cove Neck, Oyster Bay, NY — late March). She may be sheltering in vacant or seasonal properties.

Look at this satellite image of: ${address || `${latitude}, ${longitude}`}

Tell me what you see like a detective would brief their partner. Plain language, no jargon. No markdown formatting — just plain text with line breaks.

Cover these in this order:
- What's on this property? Count the structures. Main house, any outbuildings, sheds, pool houses, garages — where are they relative to each other?
- How many ways in and out? Driveways, footpaths, waterfront access?
- Does it look occupied or vacant? Cars in the driveway? Yard maintained?
- Where would someone hide here? Think sheds, dense tree cover, under decks, boats
- Where would cameras likely be? Doorbell, driveway, garage

Keep it to 100 words max. No headers, no bullet markers, no asterisks. Just short declarative sentences separated by line breaks.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: "image/jpeg", data: base64Image } },
      ]);

      const analysis = result.response.text();
      return NextResponse.json({ analysis, success: true });
    } catch (aiErr) {
      console.error("Gemini error:", aiErr);
      return NextResponse.json({ error: "AI analysis failed: " + (aiErr instanceof Error ? aiErr.message : "unknown") }, { status: 500 });
    }
  } catch (err) {
    console.error("Property analysis error:", err);
    return NextResponse.json({ error: "Request failed: " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
