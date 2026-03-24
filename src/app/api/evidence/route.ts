import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { EvidenceType, TipStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tipId = formData.get("tip_id") as string | null;
    const evidenceType = formData.get("evidence_type") as EvidenceType;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const captureDate = formData.get("capture_date") as string | null;
    const latitude = formData.get("latitude")
      ? parseFloat(formData.get("latitude") as string)
      : null;
    const longitude = formData.get("longitude")
      ? parseFloat(formData.get("longitude") as string)
      : null;
    const locationDescription = formData.get(
      "location_description"
    ) as string | null;
    const submittedByName = formData.get("submitted_by_name") as string | null;
    const submittedByEmail = formData.get(
      "submitted_by_email"
    ) as string | null;

    // Validate required fields
    if (!file || !evidenceType || !title) {
      return NextResponse.json(
        { error: "file, evidence_type, and title are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Generate unique file path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${random}-${file.name}`;
    const filePath = `evidence/${filename}`;

    // Convert file to Uint8Array (required for Supabase storage on serverless)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(filename, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("File upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("evidence").getPublicUrl(filename);

    // Create evidence record in database
    const { data, error } = await supabase
      .from("evidence")
      .insert({
        tip_id: tipId || null,
        evidence_type: evidenceType,
        title,
        description: description || null,
        file_path: filePath,
        file_url: publicUrl,
        file_size_bytes: file.size,
        mime_type: file.type,
        original_filename: file.name,
        capture_date: captureDate || null,
        latitude,
        longitude,
        location_description: locationDescription || null,
        status: "pending" as TipStatus,
        submitted_by_name: submittedByName || null,
        submitted_by_email: submittedByEmail || null,
        chain_of_custody: [
          {
            action: "uploaded",
            timestamp: new Date().toISOString(),
            by: submittedByEmail || submittedByName || "anonymous",
          },
        ],
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      // Clean up uploaded file on database error
      await supabase.storage.from("evidence").remove([filename]);
      return NextResponse.json(
        { error: "Failed to create evidence record" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: data.id,
        file_url: publicUrl,
        message: "Evidence uploaded successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Evidence upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const tipId = searchParams.get("tip_id");

    let query = supabase.from("evidence").select("*");

    if (tipId) {
      query = query.eq("tip_id", tipId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch evidence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ evidence: data || [] });
  } catch (error) {
    console.error("Evidence fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
