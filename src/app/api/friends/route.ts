import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: friendships } = await supabase
    .from("friendships")
    .select("*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq("status", "accepted");

  // Include friendship_id with each friend for unfriend functionality
  const friends = friendships?.map((f) => ({
    ...(f.requester_id === user.id ? f.addressee : f.requester),
    friendship_id: f.id,
  }));

  return NextResponse.json({ friends: friends || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { addressee_id } = await request.json();

  if (addressee_id === user.id) {
    return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id })
    .select()
    .single();

  if (error?.code === "23505") {
    return NextResponse.json({ error: "Request already sent" }, { status: 400 });
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ friendship: data });
}
