"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Place } from "@/types/database";
import { NearbySearchResponse } from "@/types/google-places";

// Calculate distance between two points in meters (Haversine formula)
function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type UseNearbyPlacesOptions = {
  radius?: number; // in meters, default 50
  debounceMs?: number; // debounce location changes, default 500
  refetchThreshold?: number; // only refetch if moved more than X meters, default 10
};

export function useNearbyPlaces(
  userLocation: [number, number] | null,
  options: UseNearbyPlacesOptions = {}
) {
  const { radius = 50, debounceMs = 500, refetchThreshold = 10 } = options;

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track last fetch position to avoid unnecessary refetches
  const lastFetchPosition = useRef<[number, number] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchNearbyPlaces = useCallback(
    async (lat: number, lng: number) => {
      // Check if we've moved enough to warrant a refetch
      if (lastFetchPosition.current) {
        const distance = getDistanceMeters(
          lastFetchPosition.current[0],
          lastFetchPosition.current[1],
          lat,
          lng
        );
        if (distance < refetchThreshold) {
          return; // Haven't moved enough
        }
      }

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          radius: radius.toString(),
        });

        const response = await fetch(`/api/places/nearby?${params}`, {
          signal: controller.signal,
        });

        const data: NearbySearchResponse = await response.json();

        if (response.ok) {
          setPlaces(data.places || []);
          lastFetchPosition.current = [lat, lng];
          if (data.error) {
            setError(data.error);
          }
        } else {
          setError(data.error || "Failed to fetch nearby places");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Request was cancelled
        }
        setError(err instanceof Error ? err.message : "Failed to fetch nearby places");
      } finally {
        setLoading(false);
      }
    },
    [radius, refetchThreshold]
  );

  // Debounced effect for location changes
  useEffect(() => {
    if (!userLocation) {
      setPlaces([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchNearbyPlaces(userLocation[0], userLocation[1]);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [userLocation, debounceMs, fetchNearbyPlaces]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Manual refetch function
  const refetch = useCallback(() => {
    if (userLocation) {
      // Reset last position to force refetch
      lastFetchPosition.current = null;
      fetchNearbyPlaces(userLocation[0], userLocation[1]);
    }
  }, [userLocation, fetchNearbyPlaces]);

  return {
    places,
    loading,
    error,
    refetch,
  };
}
