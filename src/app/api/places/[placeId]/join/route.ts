import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params; // This is now google_place_id

  if (!placeId) {
    return NextResponse.json({ error: "Place ID required" }, { status: 400 });
  }

  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse place data from request body
  let placeData;
  try {
    placeData = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Upsert the place first (create if doesn't exist)
  const { data: place, error: placeError } = await serviceClient
    .from("places")
    .upsert([{
      google_place_id: placeId,
      name: placeData.name || "Unknown",
      formatted_address: placeData.formatted_address,
      latitude: placeData.latitude,
      longitude: placeData.longitude,
      place_types: placeData.place_types || [],
      photo_reference: placeData.photo_reference,
      rating: placeData.rating,
      user_ratings_total: placeData.user_ratings_total,
      is_active: true,
    }], {
      onConflict: "google_place_id",
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (placeError || !place) {
    console.error("Place upsert failed:", { placeId, error: placeError?.message });
    return NextResponse.json({ error: "Failed to create place" }, { status: 500 });
  }

  // Check if user profile exists, create if missing
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.log("Profile missing for user, creating...", { userId: user.id });
    const { error: profileError } = await serviceClient.from("profiles").upsert({
      id: user.id,
      username: `user_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
    }, {
      onConflict: "id",
      ignoreDuplicates: true,
    });

    if (profileError) {
      console.error("Failed to create profile:", { userId: user.id, error: profileError.message });
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
    }
    console.log("Profile created successfully", { userId: user.id });
  }

  // Leave any existing place first (user can only be in one place at a time)
  await supabase.from("place_members").delete().eq("user_id", user.id);

  const { data, error } = await supabase.from("place_members").insert({
    place_id: place.id, // Use the database UUID from upsert
    user_id: user.id,
  }).select("id").single();

  if (error?.code === "23505") {
    return NextResponse.json({ message: "Already a member", placeId: place.id });
  }
  if (error) {
    console.error("Join place failed:", { placeId, userId: user.id, error: error.message, code: error.code });
    if (error.code === "23503") {
      return NextResponse.json({ error: "Invalid place or user reference" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("User joined place:", { googlePlaceId: placeId, dbPlaceId: place.id, userId: user.id, membershipId: data?.id });

  // Return the database place ID for redirect
  return NextResponse.json({ success: true, placeId: place.id });
}
