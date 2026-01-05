import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get DM threads
  const { data: threads } = await supabase
    .from("dm_threads")
    .select("*, participant_1:profiles!participant_1_id(*), participant_2:profiles!participant_2_id(*)")
    .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  // Get unread counts for DM threads
  const dmThreads = await Promise.all(
    (threads || []).map(async (thread) => {
      const { count } = await supabase
        .from("dm_messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .neq("sender_id", user.id)
        .eq("is_read", false);
      return { ...thread, type: "dm" as const, unread_count: count || 0 };
    })
  );

  // Get user's current place (only one at a time)
  const { data: membership } = await supabase
    .from("place_members")
    .select("*, place:places(*)")
    .eq("user_id", user.id)
    .single();

  let placeThread = null;
  if (membership?.place) {
    // Get latest message for preview
    const { data: latestMsg } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("place_id", membership.place.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get unread count (messages after last_read_at)
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("place_id", membership.place.id)
      .neq("sender_id", user.id)
      .gt("created_at", membership.last_read_at || "1970-01-01");

    placeThread = {
      id: membership.place.id,
      type: "place" as const,
      name: membership.place.name,
      cached_photo_url: membership.place.cached_photo_url,
      member_count: membership.place.member_count,
      last_message_at: latestMsg?.created_at || membership.joined_at,
      last_message_preview: latestMsg?.content || null,
      unread_count: unreadCount || 0,
    };
  }

  // Merge and sort by last_message_at
  const allThreads = placeThread ? [...dmThreads, placeThread] : dmThreads;
  allThreads.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());

  const totalUnread = allThreads.reduce((sum, t) => sum + (t.unread_count || 0), 0);
  return NextResponse.json({ threads: allThreads, total_unread: totalUnread });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id } = await request.json();

  // Use the database function to get or create thread
  const { data, error } = await supabase.rpc("get_or_create_dm_thread", {
    user_a: user.id,
    user_b: user_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ thread_id: data });
}
