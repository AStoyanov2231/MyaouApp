import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = request.nextUrl.searchParams.get("input");
  const sessionToken = request.nextUrl.searchParams.get("sessiontoken");
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!sessionToken) {
    return NextResponse.json({ error: "Session token required" }, { status: 400 });
  }

  // If no Google API key, return error
  if (!process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY === "your_google_api_key") {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  try {
    const requestBody: any = {
      input,
      sessionToken,
    };

    // Add location bias if coordinates provided
    if (lat && lng) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          },
          radius: 10000, // 10km
        },
      };
    }

    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!googleResponse.ok) {
      console.error("Google Autocomplete API error:", await googleResponse.text());
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 502 });
    }

    const data = await googleResponse.json();

    // Transform Google's response to our format
    const predictions = data.suggestions?.map((suggestion: any) => ({
      place_id: suggestion.placePrediction?.placeId,
      description: suggestion.placePrediction?.text?.text,
      structured_formatting: {
        main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || "",
        secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text || "",
      },
    })) || [];

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
