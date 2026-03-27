import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, address } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }

    // Fetch satellite image from ArcGIS World Imagery (free, no API key needed)
    const pad = 0.0012;
    const bbox = `${longitude - pad},${latitude - pad * 0.8},${longitude + pad},${latitude + pad * 0.8}`;
    const imageUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=1024,768&format=jpg&f=image`;

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: "Failed to fetch satellite image" }, { status: 502 });
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Send to Gemini for analysis
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are assisting a MISSING PERSONS search operation in Cove Neck, Oyster Bay, NY. A woman (Brittany, 32) has been missing for 7 days in late March. She was last seen in a panicked/psychotic state and may be hiding in vacant properties.

Analyze this satellite/aerial image of the property at: ${address || `${latitude}, ${longitude}`}

Provide a concise FIELD BRIEFING for the search team. Include:

1. **Structures visible**: List every structure you can identify (main house, guest house, pool house, shed, garage, boathouse, etc.). Describe their relative positions (e.g., "small structure NW corner behind main house").

2. **Potential hiding spots**: Dense tree cover, structures with easy access, crawl spaces, covered porches, boats under tarps, unlocked-looking outbuildings.

3. **Access points**: Driveways, paths, gates, waterfront access.

4. **Vacancy indicators**: No vehicles, pool covered, yard condition.

5. **Camera/security likely positions**: Front door, driveway entrance, garage — where to look for Ring/Nest cameras.

6. **Search priority notes**: What the team should NOT miss when they visit this property.

Format: Start with a ONE-LINE summary. Then use short bullet points. Be direct and actionable — this is for people in the field with phones. Keep it under 200 words.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      },
    ]);

    const analysis = result.response.text();

    return NextResponse.json({ analysis, success: true });
  } catch (err) {
    console.error("Property analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
