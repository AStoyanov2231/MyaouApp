import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();

  // Fetch all counts in parallel
  const [placesResult, photosResult, friendsResult] = await Promise.all([
    supabase
      .from("place_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("profile_photos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);

  const stats = {
    places_count: placesResult.count ?? 0,
    photos_count: photosResult.count ?? 0,
    friends_count: friendsResult.count ?? 0,
  };

  return NextResponse.json({ stats });
}
