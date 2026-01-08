"use client";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import { Place } from "@/types/database";
import { AutocompletePrediction } from "@/types/google-places";
import { MapContainer } from "@/components/places/MapContainer";
import { FloatingOverlay } from "@/components/places/FloatingOverlay";
import { PlaceCard } from "@/components/places/PlaceCard";

export default function PlacesPage() {
  const { suggestions, loading, fetchSuggestions, fetchPlaceDetails, resetSession } = usePlacesAutocomplete();
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [overlayMode, setOverlayMode] = useState<"search" | "loading" | "details">("search");
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [popularPlaces, setPopularPlaces] = useState<Place[]>([]);
  const [popularLoading, setPopularLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect desktop to conditionally render map (prevents Leaflet errors on mobile)
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Fetch popular places on mount
  useEffect(() => {
    const fetchPopular = async () => {
      setPopularLoading(true);
      try {
        const response = await fetch("/api/places/popular");
        const data = await response.json();
        setPopularPlaces(data.places || []);
      } catch (error) {
        console.error("Failed to fetch popular places:", error);
      } finally {
        setPopularLoading(false);
      }
    };
    fetchPopular();
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        fetchSuggestions(query, userLocation?.[0], userLocation?.[1]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions, userLocation]);

  // Request geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [
            position.coords.latitude,
            position.coords.longitude,
          ];
          setUserLocation(coords);
          setMapCenter(coords);
        },
        () => {
          // Fallback to San Francisco if geolocation denied
          setMapCenter([37.7749, -122.4194]);
        }
      );
    }
  }, []);

  const handleSuggestionClick = async (prediction: AutocompletePrediction) => {
    setOverlayMode("loading");
    const place = await fetchPlaceDetails(prediction.place_id);
    if (place) {
      setSelectedPlace(place);
      setOverlayMode("details");
      // Center map on selected place
      if (place.latitude && place.longitude) {
        setMapCenter([place.latitude, place.longitude]);
      }
    } else {
      // Error fetching details, go back to search
      setOverlayMode("search");
    }
  };

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setOverlayMode("details");
    // Center map on selected place
    if (place.latitude && place.longitude) {
      setMapCenter([place.latitude, place.longitude]);
    }
  };

  const handleBack = () => {
    setSelectedPlace(null);
    setOverlayMode("search");
    resetSession();
  };

  // Determine which places to show on map (popular places when no query)
  const displayPlaces = query.length < 2 ? popularPlaces : [];

  return (
    <>
      {/* Desktop View: Map + Overlay (conditionally rendered to prevent Leaflet errors) */}
      {isDesktop && (
        <div className="flex flex-1 relative h-screen">
          <MapContainer
            places={displayPlaces}
            center={mapCenter}
            zoom={13}
            selectedPlace={selectedPlace}
            onMarkerClick={handlePlaceSelect}
          />
          <FloatingOverlay
            mode={overlayMode}
            selectedPlace={selectedPlace}
            query={query}
            onQueryChange={setQuery}
            suggestions={suggestions}
            loading={loading}
            onSuggestionClick={handleSuggestionClick}
            onBack={handleBack}
          />
        </div>
      )}

      {/* Mobile View: Grid */}
      {!isDesktop && (
        <div className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Discover Places</h1>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for places..."
            className="pl-10 h-10"
          />
        </div>

        {(popularLoading || loading) && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Show autocomplete suggestions when typing */}
        {query.length >= 2 && suggestions.length > 0 && (
          <div className="space-y-2 mb-4">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.place_id}
                variant="outline"
                onClick={async () => {
                  const place = await fetchPlaceDetails(suggestion.place_id);
                  if (place) {
                    handlePlaceSelect(place);
                  }
                }}
                className="w-full p-3 h-auto text-left justify-start flex-col items-start"
              >
                <p className="font-semibold text-sm">{suggestion.structured_formatting.main_text}</p>
                <p className="text-xs text-muted-foreground">{suggestion.structured_formatting.secondary_text}</p>
              </Button>
            ))}
          </div>
        )}

        {/* Show popular places when no query */}
        {query.length < 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {popularPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        )}

        {!loading && !popularLoading && query.length >= 2 && suggestions.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No suggestions found</p>
        )}

        {!popularLoading && query.length < 2 && popularPlaces.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No popular places available</p>
        )}
        </div>
      )}
    </>
  );
}
