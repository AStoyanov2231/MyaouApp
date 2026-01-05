import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is participant in this thread
  const { data: thread } = await supabase
    .from("dm_threads")
    .select("id")
    .eq("id", threadId)
    .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
    .single();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Mark all unread messages in this thread as read (messages not sent by current user)
  const { error } = await supabase
    .from("dm_messages")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
