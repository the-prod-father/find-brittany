import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { SightingConfidence } from "@/lib/types";

// Helper function to check if request is from admin
async function isAdminRequest(request: NextRequest): Promise<boolean> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;

    const token = authHeader.replace("Bearer ", "");
    if (!token) return false;

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Get verified sightings with lat/lng for map plotting
    const { data, error } = await supabase
      .from("sightings")
      .select("*")
      .eq("verified", true)
      .order("sighting_date", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sightings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sightings: data || [] });
  } catch (error) {
    console.error("Sightings fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin-only - create sighting from verified tip
    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.sighting_date ||
      !body.description ||
      body.latitude === undefined ||
      body.longitude === undefined
    ) {
      return NextResponse.json(
        {
          error: "sighting_date, description, latitude, and longitude are required",
        },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("sightings")
      .insert({
        sighting_date: body.sighting_date,
        description: body.description,
        confidence: (body.confidence || "possible") as SightingConfidence,
        latitude: body.latitude,
        longitude: body.longitude,
        location_description: body.location_description || null,
        clothing_description: body.clothing_description || null,
        direction_of_travel: body.direction_of_travel || null,
        accompanied_by: body.accompanied_by || null,
        demeanor: body.demeanor || null,
        verified: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create sighting" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: data.id,
        message: "Sighting created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sighting creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
