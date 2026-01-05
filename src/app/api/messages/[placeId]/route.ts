import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is a member of this place
  const { data: membership } = await supabase
    .from("place_members")
    .select("id")
    .eq("place_id", placeId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    // User hasn't joined - return empty messages (they can still view the place but not messages)
    return NextResponse.json({ messages: [], nextCursor: null });
  }

  const cursor = request.nextUrl.searchParams.get("cursor");
  const limit = 50;

  let query = supabase
    .from("messages")
    .select("*, sender:profiles(*)")
    .eq("place_id", placeId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: messages?.reverse() || [],
    nextCursor: messages && messages.length === limit ? messages[0].created_at : null,
  });
}
