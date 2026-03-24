import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// POST /api/evidence/record — Create evidence record (metadata only, file already uploaded to storage)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.evidence_type || !body.title) {
      return NextResponse.json(
        { error: "evidence_type and title are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("evidence")
      .insert({
        tip_id: body.tip_id || null,
        evidence_type: body.evidence_type,
        title: body.title,
        description: body.description || null,
        file_path: body.file_path || null,
        file_url: body.file_url || null,
        file_size_bytes: body.file_size_bytes || null,
        mime_type: body.mime_type || null,
        original_filename: body.original_filename || null,
        capture_date: body.capture_date || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        location_description: body.location_description || null,
        status: "pending",
        submitted_by_name: body.submitted_by_name || null,
        submitted_by_email: body.submitted_by_email || null,
        chain_of_custody: [
          {
            action: "uploaded",
            timestamp: new Date().toISOString(),
            by: body.submitted_by_name || "anonymous",
          },
        ],
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create evidence record" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, id: data.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Evidence record error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
