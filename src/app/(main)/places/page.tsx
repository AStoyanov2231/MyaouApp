"use client";
import { useEffect, useState } from "react";
import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";
import { Place } from "@/types/database";
import { AutocompletePrediction } from "@/types/google-places";
import { MapContainer } from "@/components/places/MapContainer";
import { FloatingOverlay } from "@/components/places/FloatingOverlay";
import { MobilePlacesView } from "@/components/places/MobilePlacesView";

export default function PlacesPage() {
  const { suggestions, loading, fetchSuggestions, fetchPlaceDetails, resetSession } = usePlacesAutocomplete();
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [overlayMode, setOverlayMode] = useState<"search" | "loading" | "details">("search");
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
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
          setLocationPermission(true);
        },
        () => {
          setLocationPermission(false);
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
          {locationPermission === false ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <p className="text-muted-foreground font-medium">Enable location</p>
            </div>
          ) : (
            <MapContainer
              places={displayPlaces}
              center={mapCenter}
              zoom={13}
              selectedPlace={selectedPlace}
              onMarkerClick={handlePlaceSelect}
              userLocation={userLocation}
            />
          )}
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

      {/* Mobile View: Google Maps style with full-screen map */}
      {!isDesktop && (
        <MobilePlacesView
          query={query}
          onQueryChange={setQuery}
          suggestions={suggestions}
          loading={loading}
          selectedPlace={selectedPlace}
          mapCenter={mapCenter}
          displayPlaces={displayPlaces}
          onSuggestionClick={handleSuggestionClick}
          onPlaceSelect={handlePlaceSelect}
          onBack={handleBack}
          overlayMode={overlayMode}
          userLocation={userLocation}
          locationPermission={locationPermission}
        />
      )}
    </>
  );
}
