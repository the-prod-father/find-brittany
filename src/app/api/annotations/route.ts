import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("map_annotations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
    return NextResponse.json({ annotations: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.bounds || !body.question) {
      return NextResponse.json({ error: "name, bounds, and question required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("map_annotations")
      .insert({
        name: body.name,
        bounds: body.bounds,
        question: body.question,
        response: body.response || "",
        created_by: body.created_by || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
    return NextResponse.json({ annotation: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("map_annotations")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
