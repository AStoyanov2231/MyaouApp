import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: place } = await supabase
    .from("places")
    .select("*")
    .eq("id", placeId)
    .single();

  if (!place) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("place_members")
    .select("*")
    .eq("place_id", placeId)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ place, isMember: !!membership });
}
