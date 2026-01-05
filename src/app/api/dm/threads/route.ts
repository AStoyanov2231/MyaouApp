import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: threads } = await supabase
    .from("dm_threads")
    .select("*, participant_1:profiles!participant_1_id(*), participant_2:profiles!participant_2_id(*)")
    .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  // Get unread counts for each thread
  const threadsWithUnread = await Promise.all(
    (threads || []).map(async (thread) => {
      const { count } = await supabase
        .from("dm_messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .neq("sender_id", user.id)
        .eq("is_read", false);
      return { ...thread, unread_count: count || 0 };
    })
  );

  return NextResponse.json({ threads: threadsWithUnread, total_unread: threadsWithUnread.reduce((sum, t) => sum + (t.unread_count || 0), 0) });
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
