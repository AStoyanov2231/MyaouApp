import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Place } from "@/types/database";

// Calculate bounding box from center point and radius (meters)
function getBoundingBox(lat: number, lng: number, radiusMeters: number) {
  // Earth's radius in meters
  const earthRadius = 6371000;

  // Angular distance in radians
  const angularDistance = radiusMeters / earthRadius;

  // Convert to degrees
  const latDelta = (angularDistance * 180) / Math.PI;
  const lngDelta = (angularDistance * 180) / (Math.PI * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  const radiusParam = request.nextUrl.searchParams.get("radius");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Latitude and longitude required" }, { status: 400 });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radius = radiusParam ? parseFloat(radiusParam) : 50; // Default 50m

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // Validate coordinate bounds
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Coordinates out of range" }, { status: 400 });
  }

  // Validate radius (1m to 50km max)
  if (isNaN(radius) || radius <= 0 || radius > 50000) {
    return NextResponse.json({ error: "Invalid radius" }, { status: 400 });
  }

  // Calculate bounding box for DB query
  const bounds = getBoundingBox(latitude, longitude, radius);

  // Check DB for cached places in this area
  const { data: cachedPlaces, error: dbError } = await supabase
    .from("places")
    .select("*")
    .gte("latitude", bounds.minLat)
    .lte("latitude", bounds.maxLat)
    .gte("longitude", bounds.minLng)
    .lte("longitude", bounds.maxLng);

  if (dbError) {
    console.error("DB query error:", dbError);
  }

  // If we have cached places, return them
  if (cachedPlaces && cachedPlaces.length > 0) {
    console.log(`[NEARBY] ✅ CACHE HIT - Returning ${cachedPlaces.length} places from Supabase DB`);
    return NextResponse.json({
      places: cachedPlaces as Place[],
      source: "cache",
    });
  }

  console.log(`[NEARBY] ❌ CACHE MISS - No cached places found, calling Google API...`);

  // No cached places, fetch from Google
  if (!process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY === "your_google_api_key") {
    return NextResponse.json({
      places: [],
      source: "cache",
      message: "No cached places and Google API not configured"
    });
  }

  try {
    // Google Places Nearby Search (New) API
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.location",
      "places.types",
      "places.rating",
      "places.userRatingCount",
      "places.photos"
    ].join(",");

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": fieldMask,
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: {
                latitude,
                longitude,
              },
              radius,
            },
          },
          maxResultCount: 20,
        }),
      }
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error("Google Nearby Search API error:", errorText);
      return NextResponse.json({
        places: [],
        source: "google",
        error: "Failed to fetch nearby places"
      });
    }

    const data = await googleResponse.json();
    const googlePlaces = data.places || [];

    if (googlePlaces.length === 0) {
      return NextResponse.json({ places: [], source: "google" });
    }

    // Transform and save places to DB (filter out places without valid coordinates)
    const placesToInsert = googlePlaces
      .filter((place: any) =>
        place.id &&
        place.location?.latitude != null &&
        place.location?.longitude != null
      )
      .map((place: any) => ({
        google_place_id: place.id,
        name: place.displayName?.text || "Unknown",
        formatted_address: place.formattedAddress || null,
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        place_types: place.types || [],
        photo_reference: place.photos?.[0]?.name || null,
        rating: place.rating || null,
        user_ratings_total: place.userRatingCount || null,
        member_count: 0,
        message_count: 0,
        is_active: false,
      }));

    if (placesToInsert.length === 0) {
      return NextResponse.json({ places: [], source: "google" });
    }

    // Upsert places (insert if not exists, update if exists) - use service client to bypass RLS
    const { data: insertedPlaces, error: insertError } = await serviceClient
      .from("places")
      .upsert(placesToInsert, {
        onConflict: "google_place_id",
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error("[NEARBY] ⚠️ DB SAVE FAILED:", insertError);
      // Return transformed places even if DB save fails
      const transformedPlaces: Place[] = placesToInsert.map((p: any, i: number) => ({
        ...p,
        id: googlePlaces[i].id,
        cached_photo_url: null,
        created_at: new Date().toISOString(),
      }));
      return NextResponse.json({ places: transformedPlaces, source: "google" });
    }

    console.log(`[NEARBY] 🌐 GOOGLE API - Fetched ${insertedPlaces?.length || 0} places and saved to Supabase DB`);

    return NextResponse.json({
      places: insertedPlaces as Place[],
      source: "google",
    });
  } catch (error) {
    console.error("Nearby search error:", error);
    return NextResponse.json({
      places: [],
      source: "google",
      error: "Failed to fetch nearby places"
    });
  }
}
