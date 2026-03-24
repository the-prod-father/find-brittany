import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("canvass_locations")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
    return NextResponse.json({ locations: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("canvass_locations")
      .insert({
        address: body.address,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        status: body.status || "not_visited",
        notes: body.notes || null,
        priority: body.priority || "medium",
        has_camera: body.has_camera || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.contacted_by !== undefined) updateData.contacted_by = body.contacted_by;
    if (body.contacted_at !== undefined) updateData.contacted_at = body.contacted_at;
    if (body.has_camera !== undefined) updateData.has_camera = body.has_camera;
    if (body.camera_type !== undefined) updateData.camera_type = body.camera_type;
    if (body.footage_obtained !== undefined) updateData.footage_obtained = body.footage_obtained;
    if (body.footage_notes !== undefined) updateData.footage_notes = body.footage_notes;
    if (body.latitude !== undefined) updateData.latitude = body.latitude;
    if (body.longitude !== undefined) updateData.longitude = body.longitude;

    const { data, error } = await supabase
      .from("canvass_locations")
      .update(updateData)
      .eq("id", body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
