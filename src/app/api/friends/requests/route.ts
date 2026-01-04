import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: requests } = await supabase
    .from("friendships")
    .select("*, requester:profiles!requester_id(*)")
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  return NextResponse.json({ requests: requests || [] });
}
