import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { place_id, content, message_type = "text", media_url, media_thumbnail_url, reply_to_id } = await request.json();

  // Check membership
  const { data: membership, error: membershipError } = await supabase
    .from("place_members")
    .select("id")
    .eq("place_id", place_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    console.error("Membership check failed:", {
      place_id,
      user_id: user.id,
      error: membershipError?.message,
      code: membershipError?.code
    });
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      place_id,
      sender_id: user.id,
      content,
      message_type,
      media_url,
      media_thumbnail_url,
      reply_to_id,
    })
    .select("*, sender:profiles(*)")
    .single();

  if (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
