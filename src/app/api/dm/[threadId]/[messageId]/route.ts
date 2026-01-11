import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EDIT_WINDOW_MINUTES = 15;

// Helper to verify user is a participant in the thread
async function verifyThreadAccess(supabase: Awaited<ReturnType<typeof createClient>>, threadId: string, userId: string) {
  const { data: thread } = await supabase
    .from("dm_threads")
    .select("participant_1_id, participant_2_id")
    .eq("id", threadId)
    .single();

  return thread && (thread.participant_1_id === userId || thread.participant_2_id === userId);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> }
) {
  const { threadId, messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is a participant in this thread
  const hasAccess = await verifyThreadAccess(supabase, threadId, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get the message to verify ownership and check edit window
  const { data: message, error: fetchError } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("id", messageId)
    .eq("thread_id", threadId)
    .single();

  if (fetchError || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.sender_id !== user.id) {
    return NextResponse.json({ error: "Cannot edit others' messages" }, { status: 403 });
  }

  if (message.is_deleted) {
    return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });
  }

  // Check 15-minute edit window
  const createdAt = new Date(message.created_at);
  const now = new Date();
  const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

  if (minutesSinceCreation > EDIT_WINDOW_MINUTES) {
    return NextResponse.json(
      { error: `Edit window expired (${EDIT_WINDOW_MINUTES} minutes)` },
      { status: 400 }
    );
  }

  // Parse request body with error handling
  let content: string;
  try {
    const body = await request.json();
    content = body.content;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("dm_messages")
    .update({
      content: content.trim(),
      is_edited: true,
    })
    .eq("id", messageId)
    .select("*, sender:profiles(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> }
) {
  const { threadId, messageId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is a participant in this thread
  const hasAccess = await verifyThreadAccess(supabase, threadId, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get the message to verify ownership
  const { data: message, error: fetchError } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("id", messageId)
    .eq("thread_id", threadId)
    .single();

  if (fetchError || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (message.sender_id !== user.id) {
    return NextResponse.json({ error: "Cannot delete others' messages" }, { status: 403 });
  }

  if (message.is_deleted) {
    return NextResponse.json({ error: "Message already deleted" }, { status: 400 });
  }

  // Soft delete - set is_deleted to true
  const { data, error } = await supabase
    .from("dm_messages")
    .update({
      is_deleted: true,
      content: null, // Clear content on delete
    })
    .eq("id", messageId)
    .select("*, sender:profiles(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
