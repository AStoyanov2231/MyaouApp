"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input, Spinner } from "@/components/ui";
import { usePlaces } from "@/hooks/usePlaces";
import { Place } from "@/types/database";
import { MapContainer } from "@/components/places/MapContainer";
import { FloatingOverlay } from "@/components/places/FloatingOverlay";
import { PlaceCard } from "@/components/places/PlaceCard";

export default function PlacesPage() {
  const { places, loading, search, fetchPopular } = usePlaces();
  const [query, setQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [overlayMode, setOverlayMode] = useState<"search" | "details">("search");
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Fetch popular places on mount
  useEffect(() => {
    fetchPopular();
  }, [fetchPopular]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query, userLocation?.[0], userLocation?.[1]);
      } else if (query.length === 0) {
        fetchPopular();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, fetchPopular, userLocation]);

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
  };

  return (
    <>
      {/* Desktop View: Map + Overlay */}
      <div className="hidden md:flex md:flex-1 relative h-screen">
        <MapContainer
          places={places}
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
          places={places}
          loading={loading}
          onPlaceSelect={handlePlaceSelect}
          onBack={handleBack}
        />
      </div>

      {/* Mobile View: Grid */}
      <div className="md:hidden p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Discover Places</h1>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for places..."
            className="pl-10"
          />
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>

        {!loading && places.length === 0 && (
          <p className="text-center text-gray-500 py-8">No places found</p>
        )}
      </div>
    </>
  );
}
