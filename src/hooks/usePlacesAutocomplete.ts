"use client";
import { useState, useCallback } from "react";
import { AutocompletePrediction, PlaceDetailsResponse } from "@/types/google-places";
import { Place } from "@/types/database";

export function usePlacesAutocomplete() {
  const [suggestions, setSuggestions] = useState<AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate a new session token
  const generateSessionToken = useCallback(() => {
    if (typeof window !== "undefined" && window.crypto) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(
    async (input: string, lat?: number, lng?: number) => {
      if (input.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Generate session token if none exists
        let token = sessionToken;
        if (!token) {
          token = generateSessionToken();
          setSessionToken(token);
        }

        // Build query parameters
        const params = new URLSearchParams({
          input,
          sessiontoken: token,
        });

        if (lat !== undefined && lng !== undefined) {
          params.append("lat", lat.toString());
          params.append("lng", lng.toString());
        }

        const response = await fetch(`/api/places/autocomplete?${params}`);
        const data = await response.json();

        if (response.ok) {
          setSuggestions(data.predictions || []);
        } else {
          setError(data.error || "Failed to fetch suggestions");
          setSuggestions([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch suggestions");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [sessionToken, generateSessionToken]
  );

  // Fetch full place details when user selects a suggestion
  const fetchPlaceDetails = useCallback(
    async (googlePlaceId: string): Promise<Place | null> => {
      try {
        setDetailsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          placeid: googlePlaceId,
        });

        // Include session token if available (consumed by this request)
        if (sessionToken) {
          params.append("sessiontoken", sessionToken);
        }

        const response = await fetch(`/api/places/details?${params}`);
        const data = await response.json();

        if (response.ok && data.place) {
          // Clear session token (it's consumed by the details request)
          setSessionToken(null);
          setSuggestions([]);
          return data.place;
        } else {
          setError((data as any).error || "Failed to fetch place details");
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch place details");
        return null;
      } finally {
        setDetailsLoading(false);
      }
    },
    [sessionToken]
  );

  // Reset the session (clear token, suggestions, and generate new token)
  const resetSession = useCallback(() => {
    setSessionToken(generateSessionToken());
    setSuggestions([]);
    setError(null);
  }, [generateSessionToken]);

  return {
    suggestions,
    loading,
    detailsLoading,
    error,
    fetchSuggestions,
    fetchPlaceDetails,
    resetSession,
  };
}
