import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET /api/news — Return all news-sourced timeline events
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("timeline_events")
      .select("*")
      .eq("event_type", "media")
      .eq("is_public", true)
      .order("event_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
    }

    return NextResponse.json({ articles: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/news — Manually add a news article as a timeline event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.source_url) {
      return NextResponse.json(
        { error: "title and source_url are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check for duplicate URL
    const { data: existing } = await supabase
      .from("timeline_events")
      .select("id")
      .eq("source_url", body.source_url)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { message: "Article already ingested", id: existing[0].id },
        { status: 200 }
      );
    }

    const { data, error } = await supabase
      .from("timeline_events")
      .insert({
        event_type: "media",
        event_date: body.event_date || new Date().toISOString(),
        title: body.title,
        description: body.description || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        location_description: body.location_description || null,
        is_public: true,
        is_pinned: false,
        source: body.source || null,
        source_url: body.source_url,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create news event" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
