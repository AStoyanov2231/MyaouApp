import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Place } from "@/types/database";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: history, error } = await supabase
    .from("place_history")
    .select(`
      id,
      visited_at,
      place:places(*)
    `)
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Failed to fetch place history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }

  // Flatten to return places with visited_at
  // Supabase returns place as array due to generic typing, but it's actually a single object
  const places: (Place & { visited_at: string })[] = [];
  for (const h of history || []) {
    const place = h.place as unknown as Place | null;
    if (place && place.is_active) {
      places.push({
        ...place,
        visited_at: h.visited_at,
      });
    }
  }

  return NextResponse.json({ places });
}
