import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Verify cron secret to prevent unauthorized access
function verifyCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Allow Vercel cron jobs
  if (request.headers.get("x-vercel-cron")) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    // Get existing source URLs to avoid duplicates
    const { data: existing } = await supabase
      .from("timeline_events")
      .select("source_url")
      .eq("event_type", "media")
      .not("source_url", "is", null);

    const existingUrls = new Set((existing || []).map((e) => e.source_url));

    // Use Claude to search and analyze recent news
    const today = new Date().toISOString().split("T")[0];
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Search your knowledge for the latest news and social media updates about the missing person case of Brittany Kritis-Garip from Oyster Bay, Long Island, NY. She went missing on March 20, 2026. Today is ${today}.

Return ONLY a JSON array of news items you know about. Each item should have:
- title: headline
- description: summary of the article/post
- source: publication or platform name
- source_url: URL if known (or null)
- event_date: ISO date of the article/event
- location_description: location mentioned if any

Only include items you are confident about. Do not fabricate URLs or articles.
If you don't have any new information beyond what's already known, return an empty array: []

Already known URLs to skip: ${JSON.stringify([...existingUrls].slice(0, 20))}

Return ONLY valid JSON, no other text.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ message: "No text response", ingested: 0 });
    }

    let jsonStr = content.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let articles: Array<{
      title: string;
      description: string;
      source: string;
      source_url: string | null;
      event_date: string;
      location_description: string | null;
    }>;

    try {
      articles = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ message: "Failed to parse response", ingested: 0 });
    }

    if (!Array.isArray(articles) || articles.length === 0) {
      // Add an hourly "no new updates" check log
      return NextResponse.json({ message: "No new articles found", ingested: 0 });
    }

    let ingested = 0;
    for (const article of articles) {
      // Skip if URL already exists
      if (article.source_url && existingUrls.has(article.source_url)) continue;

      const { error } = await supabase.from("timeline_events").insert({
        event_type: "media",
        event_date: article.event_date || new Date().toISOString(),
        title: article.title,
        description: article.description,
        location_description: article.location_description || "Oyster Bay, NY",
        latitude: 40.8715,
        longitude: -73.5320,
        is_public: true,
        is_pinned: false,
        source: article.source,
        source_url: article.source_url,
      });

      if (!error) ingested++;
    }

    return NextResponse.json({
      message: `Cron completed. Ingested ${ingested} new articles.`,
      ingested,
      checked: articles.length,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
