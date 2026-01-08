import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const placeId = request.nextUrl.searchParams.get("placeid");
  const sessionToken = request.nextUrl.searchParams.get("sessiontoken");

  if (!placeId) {
    return NextResponse.json({ error: "Place ID required" }, { status: 400 });
  }

  // Check database cache first
  const { data: cachedPlace } = await supabase
    .from("places")
    .select("*")
    .eq("google_place_id", placeId)
    .single();

  // If cached and not expired, return from database
  if (cachedPlace && cachedPlace.cache_expires_at) {
    const expiresAt = new Date(cachedPlace.cache_expires_at);
    if (expiresAt > new Date()) {
      return NextResponse.json({
        place: cachedPlace,
        source: "cache",
      });
    }
  }

  // If no Google API key, return cached place or error
  if (!process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY === "your_google_api_key") {
    if (cachedPlace) {
      return NextResponse.json({
        place: cachedPlace,
        source: "cache",
      });
    }
    return NextResponse.json({ error: "Google API key not configured" }, { status: 503 });
  }

  try {
    // Build the field mask for the details we need
    const fieldMask = [
      "id",
      "displayName",
      "formattedAddress",
      "location",
      "types",
      "rating",
      "userRatingCount",
      "photos"
    ].join(",");

    // Construct the URL with session token if provided
    let url = `https://places.googleapis.com/v1/places/${placeId}`;
    if (sessionToken) {
      url += `?sessionToken=${sessionToken}`;
    }

    const googleResponse = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
    });

    if (!googleResponse.ok) {
      console.error("Google Place Details API error:", await googleResponse.text());
      // Return cached place if available, even if expired
      if (cachedPlace) {
        return NextResponse.json({
          place: cachedPlace,
          source: "cache",
        });
      }
      return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
    }

    const place = await googleResponse.json();

    // Transform Google response to our database schema
    const placeData = {
      google_place_id: place.id,
      name: place.displayName?.text || "Unknown",
      formatted_address: place.formattedAddress,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      place_types: place.types || [],
      photo_reference: place.photos?.[0]?.name,
      rating: place.rating,
      user_ratings_total: place.userRatingCount,
      cache_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Use service client to upsert (bypasses RLS)
    const serviceClient = await createServiceClient();
    await serviceClient.from("places").upsert([placeData], {
      onConflict: "google_place_id",
      ignoreDuplicates: false,
    });

    // Fetch the complete place record with all database fields
    const { data: insertedPlace } = await supabase
      .from("places")
      .select("*")
      .eq("google_place_id", placeData.google_place_id)
      .single();

    return NextResponse.json({
      place: insertedPlace,
      source: "google",
    });
  } catch (error) {
    console.error("Place details error:", error);
    // Return cached place if available
    if (cachedPlace) {
      return NextResponse.json({
        place: cachedPlace,
        source: "cache",
      });
    }
    return NextResponse.json({ error: "Failed to fetch place details" }, { status: 500 });
  }
}
