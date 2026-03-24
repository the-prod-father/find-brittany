import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TipStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: "title and description are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Insert tip into database
    const { data, error } = await supabase
      .from("tips")
      .insert({
        title: body.title,
        description: body.description,
        submitter_name: body.submitter_name || null,
        submitter_email: body.submitter_email || null,
        submitter_phone: body.submitter_phone || null,
        is_anonymous: body.is_anonymous === true,
        tip_date: body.tip_date || null,
        location_description: body.location_description || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        status: "pending" as TipStatus,
        urgency: "low",
        source: "web_submission",
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to submit tip" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: data.id,
        message: "Tip submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Tip submission error:", error);
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
    const all = searchParams.get("all") === "true";

    // Build query
    let query = supabase
      .from("tips")
      .select("*")
      .order("created_at", { ascending: false });

    // If not requesting all, only return verified/critical tips for public consumption
    if (!all) {
      query = query.in("status", ["verified", "critical"]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tips" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tips: data || [] });
  } catch (error) {
    console.error("Tip fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
