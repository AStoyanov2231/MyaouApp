import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ friendshipId: string }> }) {
  const { friendshipId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let status: string;
  try {
    const body = await request.json();
    status = body.status;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate status value
  const validStatuses = ["accepted", "blocked"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Friend limits are enforced atomically by the database trigger (check_friendship_limit)
  // to prevent race conditions. The trigger raises exceptions that we handle below.
  const { data, error } = await supabase
    .from("friendships")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .select()
    .single();

  if (error) {
    // Handle friend limit trigger errors
    if (error.message?.includes('FRIEND_LIMIT_REACHED')) {
      return NextResponse.json(
        { error: "FRIEND_LIMIT_REACHED", message: "You have reached your friend limit. Upgrade to Premium for unlimited friends." },
        { status: 403 }
      );
    }
    if (error.message?.includes('REQUESTER_LIMIT_REACHED')) {
      return NextResponse.json(
        { error: "REQUESTER_LIMIT_REACHED", message: "The requester has reached their friend limit." },
        { status: 403 }
      );
    }
    // Handle case where friendship doesn't exist or user isn't the addressee
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ friendshipId: string }> }) {
  const { friendshipId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service client to bypass RLS for reliable deletion
  const serviceClient = createServiceClient();

  // First verify the friendship exists and user is authorized (requester or addressee)
  const { data: friendship, error: fetchError } = await serviceClient
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("id", friendshipId)
    .single();

  if (fetchError || !friendship) {
    return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  }

  // Verify user is part of this friendship
  if (friendship.requester_id !== user.id && friendship.addressee_id !== user.id) {
    return NextResponse.json({ error: "Not authorized to delete this friendship" }, { status: 403 });
  }

  // Delete the friendship
  const { error: deleteError } = await serviceClient
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
