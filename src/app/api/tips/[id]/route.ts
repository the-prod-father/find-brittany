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

    // Only update provided fields
    if (body.status) updateData.status = body.status;
    if (body.reviewer_notes !== undefined) updateData.reviewer_notes = body.reviewer_notes;
    if (body.reviewed_at) updateData.reviewed_at = body.reviewed_at;
    if (body.urgency) updateData.urgency = body.urgency;
    if (body.reviewed_by) updateData.reviewed_by = body.reviewed_by;

    // Always update updated_at
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tips")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update tip" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: "Tip updated successfully",
    });
  } catch (error) {
    console.error("Tip update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("tips")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Tip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tip: data });
  } catch (error) {
    console.error("Tip fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
