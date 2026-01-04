import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: thread } = await supabase
    .from("dm_threads")
    .select("*, participant_1:profiles!participant_1_id(*), participant_2:profiles!participant_2_id(*)")
    .eq("id", threadId)
    .single();

  if (!thread || (thread.participant_1_id !== user.id && thread.participant_2_id !== user.id)) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from("dm_messages")
    .select("*, sender:profiles(*)")
    .eq("thread_id", threadId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  return NextResponse.json({ thread, messages: messages || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, message_type = "text", media_url } = await request.json();

  const { data, error } = await supabase
    .from("dm_messages")
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      content,
      message_type,
      media_url,
    })
    .select("*, sender:profiles(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
