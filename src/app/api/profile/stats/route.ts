import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all counts in parallel
  const [placesResult, photosResult, friendsResult] = await Promise.all([
    supabase
      .from("place_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("profile_photos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  const stats = {
    places_count: placesResult.count ?? 0,
    photos_count: photosResult.count ?? 0,
    friends_count: friendsResult.count ?? 0,
  };

  return NextResponse.json({ stats });
}
