import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Leave any existing place first (user can only be in one place at a time)
  await supabase.from("place_members").delete().eq("user_id", user.id);

  const { data, error } = await supabase.from("place_members").insert({
    place_id: placeId,
    user_id: user.id,
  }).select("id").single();

  if (error?.code === "23505") {
    return NextResponse.json({ message: "Already a member" });
  }
  if (error) {
    console.error("Join place failed:", { placeId, userId: user.id, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("User joined place:", { placeId, userId: user.id, membershipId: data?.id });

  return NextResponse.json({ success: true });
}
