import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;

  // Validate placeId format (UUID format for database ID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!placeId || !uuidRegex.test(placeId)) {
    return NextResponse.json({ error: "Invalid place ID format" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if place exists
  const { data: place } = await supabase
    .from("places")
    .select("id")
    .eq("id", placeId)
    .single();

  if (!place) {
    console.error("Join place failed: Place not found", { placeId, userId: user.id });
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  // Check if user profile exists, create if missing
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    console.log("Profile missing for user, creating...", { userId: user.id });
    const serviceClient = await createServiceClient();
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
    place_id: placeId,
    user_id: user.id,
  }).select("id").single();

  if (error?.code === "23505") {
    return NextResponse.json({ message: "Already a member" });
  }
  if (error) {
    console.error("Join place failed:", { placeId, userId: user.id, error: error.message, code: error.code });
    // Provide more specific error messages
    if (error.code === "23503") {
      return NextResponse.json({ error: "Invalid place or user reference" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("User joined place:", { placeId, userId: user.id, membershipId: data?.id });

  return NextResponse.json({ success: true });
}
