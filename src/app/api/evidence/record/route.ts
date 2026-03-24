import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";

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

    // Send email notification
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Find Brittany <onboarding@resend.dev>",
          to: "gavin@whynotus.ai",
          subject: `New evidence uploaded: ${body.title || "Unknown"}`,
          html: `
            <h2>New Evidence Submitted</h2>
            <p><strong>File:</strong> ${body.title || "Unknown"}</p>
            <p><strong>Type:</strong> ${body.evidence_type || "Unknown"}</p>
            <p><strong>Location:</strong> ${body.location_description || "Not provided"}</p>
            <p><strong>From:</strong> ${body.submitted_by_name || "Anonymous"}</p>
            ${body.file_url ? `<p><strong>File:</strong> <a href="${body.file_url}">View file</a></p>` : ""}
            <p><a href="https://find-brittany.vercel.app/review/bk-ops-7347">Review now</a></p>
          `,
        });
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }
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
