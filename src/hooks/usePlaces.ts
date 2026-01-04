"use client";
import { useState, useCallback } from "react";
import type { Place } from "@/types/database";

export function usePlaces() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, lat?: number, lng?: number) => {
    if (query.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query });
      if (lat && lng) {
        params.set("lat", lat.toString());
        params.set("lng", lng.toString());
      }
      const res = await fetch(`/api/places/search?${params}`);
      const data = await res.json();
      setPlaces(data.places || []);
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPopular = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/places/popular");
      const data = await res.json();
      setPlaces(data.places || []);
    } catch {
      setError("Failed to load places");
    } finally {
      setLoading(false);
    }
  }, []);

  return { places, loading, error, search, fetchPopular };
}
