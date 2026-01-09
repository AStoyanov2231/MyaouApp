"use client";

import { useState, useEffect } from "react";

import { Loader2 } from "lucide-react";

import { Place } from "@/types/database";
import { AutocompletePrediction } from "@/types/google-places";

import { MapContainer } from "./MapContainer";
import { MobileSearchBar } from "./MobileSearchBar";
import { MobileBottomPanel } from "./MobileBottomPanel";

type MobileViewState = "idle" | "loading" | "details";

type MobilePlacesViewProps = {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: AutocompletePrediction[];
  loading: boolean;
  selectedPlace: Place | null;
  mapCenter: [number, number];
  displayPlaces: Place[];
  onSuggestionClick: (prediction: AutocompletePrediction) => void;
  onPlaceSelect: (place: Place) => void;
  onBack: () => void;
  overlayMode: "search" | "loading" | "details";
};

export function MobilePlacesView({
  query,
  onQueryChange,
  suggestions,
  loading,
  selectedPlace,
  mapCenter,
  displayPlaces,
  onSuggestionClick,
  onPlaceSelect,
  onBack,
  overlayMode,
}: MobilePlacesViewProps) {
  const [viewState, setViewState] = useState<MobileViewState>("idle");

  // Sync viewState with parent's overlayMode
  useEffect(() => {
    if (overlayMode === "loading") {
      setViewState("loading");
    } else if (overlayMode === "details" && selectedPlace) {
      setViewState("details");
    } else {
      setViewState("idle");
    }
  }, [overlayMode, selectedPlace]);

  const handleCloseDetails = () => {
    onBack();
    setViewState("idle");
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Full-screen map as base layer */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          places={displayPlaces}
          center={mapCenter}
          zoom={13}
          selectedPlace={selectedPlace}
          onMarkerClick={onPlaceSelect}
        />
      </div>

      {/* Top search bar - always visible except during loading */}
      {viewState !== "loading" && (
        <MobileSearchBar
          query={query}
          onQueryChange={onQueryChange}
          suggestions={suggestions}
          loading={loading}
          onSuggestionClick={onSuggestionClick}
        />
      )}

      {/* Loading overlay */}
      {viewState === "loading" && (
        <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-[fadeIn_0.2s_ease-out]">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="absolute inset-0 blur-xl gradient-brand-subtle animate-pulse" />
          </div>
          <p className="mt-4 text-muted-foreground font-medium">Loading place details...</p>
        </div>
      )}

      {/* Bottom panel for place details */}
      {viewState === "details" && selectedPlace && (
        <MobileBottomPanel
          place={selectedPlace}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}
