import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: interests, error } = await supabase
    .from("profile_interests")
    .select("*, tag:interest_tags(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ interests });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { tag_id } = body;

  if (!tag_id) {
    return NextResponse.json({ error: "tag_id is required" }, { status: 400 });
  }

  // Insert will fail if max 5 interests (via trigger)
  const { data: interest, error } = await supabase
    .from("profile_interests")
    .insert({
      user_id: user.id,
      tag_id,
    })
    .select("*, tag:interest_tags(*)")
    .single();

  if (error) {
    if (error.message.includes("Maximum of 5 interests")) {
      return NextResponse.json(
        { error: "Maximum of 5 interests allowed" },
        { status: 400 }
      );
    }
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Interest already added" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ interest }, { status: 201 });
}
