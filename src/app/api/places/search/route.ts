import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  // Check cache first
  const { data: cachedPlaces } = await supabase
    .from("places")
    .select("*")
    .ilike("name", `%${query}%`)
    .gte("cache_expires_at", new Date().toISOString())
    .limit(10);

  if (cachedPlaces && cachedPlaces.length >= 5) {
    return NextResponse.json({ places: cachedPlaces, source: "cache" });
  }

  // Query Google Places API
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({
      places: cachedPlaces || [],
      source: "cache",
      warning: "Google API not configured",
    });
  }

  try {
    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.photos",
        },
        body: JSON.stringify({
          textQuery: query,
          locationBias:
            lat && lng
              ? {
                  circle: {
                    center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
                    radius: 10000,
                  },
                }
              : undefined,
          maxResultCount: 10,
        }),
      }
    );

    if (!googleResponse.ok) {
      const { data: fallback } = await supabase.rpc("get_popular_places", { limit_count: 20 });
      return NextResponse.json({
        places: fallback || cachedPlaces || [],
        source: "fallback",
      });
    }

    const data = await googleResponse.json();
    const serviceClient = await createServiceClient();

    const placesToCache =
      data.places?.map((place: any) => ({
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
      })) || [];

    if (placesToCache.length > 0) {
      await serviceClient.from("places").upsert(placesToCache, {
        onConflict: "google_place_id",
        ignoreDuplicates: false,
      });
    }

    const { data: insertedPlaces } = await supabase
      .from("places")
      .select("*")
      .in("google_place_id", placesToCache.map((p: any) => p.google_place_id));

    return NextResponse.json({ places: insertedPlaces, source: "google" });
  } catch {
    const { data: fallback } = await supabase.rpc("get_popular_places", { limit_count: 20 });
    return NextResponse.json({
      places: fallback || cachedPlaces || [],
      source: "fallback",
    });
  }
}
