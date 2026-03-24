import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServiceClient();

    const updateData: Record<string, unknown> = {};

    // Allow updating these fields
    if (body.status !== undefined) updateData.status = body.status;
    if (body.latitude !== undefined) updateData.latitude = body.latitude;
    if (body.longitude !== undefined) updateData.longitude = body.longitude;
    if (body.location_description !== undefined) updateData.location_description = body.location_description;
    if (body.capture_date !== undefined) updateData.capture_date = body.capture_date;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.reviewer_notes !== undefined) updateData.reviewer_notes = body.reviewer_notes;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("evidence")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Failed to update evidence" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Evidence update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
