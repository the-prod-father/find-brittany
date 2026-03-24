import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Helper function to check if request is from admin (basic auth check)
async function isAdminRequest(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;

    // In a real app, verify the token properly
    // This is a simplified version - in production use proper JWT verification
    const token = authHeader.replace("Bearer ", "");
    if (!token) return false;

    // For now, we'll just check if there's a token
    // In production, verify this against your auth service
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const allParam = searchParams.get("all") === "true";

    let query = supabase
      .from("timeline_events")
      .select("*")
      .order("event_date", { ascending: false });

    // If all=true is passed, admin can see all events (requires auth check)
    if (allParam) {
      const isAdmin = await isAdminRequest(request);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      // Public consumption - only public events
      query = query.eq("is_public", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch timeline events" },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error("Timeline fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin-only endpoint for creating timeline events
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.event_type || !body.event_date || !body.title) {
      return NextResponse.json(
        { error: "event_type, event_date, and title are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("timeline_events")
      .insert({
        event_type: body.event_type,
        event_date: body.event_date,
        title: body.title,
        description: body.description || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        location_description: body.location_description || null,
        is_public: body.is_public !== false,
        is_pinned: body.is_pinned === true,
        source: body.source || null,
        source_url: body.source_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create timeline event" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: data.id,
        message: "Timeline event created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Timeline creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
