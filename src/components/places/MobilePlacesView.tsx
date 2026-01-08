"use client";

import { useState, useEffect } from "react";

import { Loader2 } from "lucide-react";

import { Place } from "@/types/database";
import { AutocompletePrediction } from "@/types/google-places";

import { MapContainer } from "./MapContainer";
import { MobileSearchBar } from "./MobileSearchBar";
import { MobileBottomPanel } from "./MobileBottomPanel";

type MobileViewState = "idle" | "searching" | "loading" | "details";

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
    } else if (viewState === "loading" || viewState === "details") {
      // Only reset to idle if we were in loading/details
      setViewState("idle");
    }
  }, [overlayMode, selectedPlace]);

  const handleExpandSearch = () => {
    setViewState("searching");
  };

  const handleCollapseSearch = () => {
    setViewState(selectedPlace ? "details" : "idle");
  };

  const handleSuggestionClick = (prediction: AutocompletePrediction) => {
    // Let parent handle the async flow
    onSuggestionClick(prediction);
    // State will update via overlayMode sync
  };

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

      {/* Top search bar - visible in idle and details states */}
      {(viewState === "idle" || viewState === "details") && (
        <MobileSearchBar
          query={query}
          onQueryChange={onQueryChange}
          isExpanded={false}
          onExpand={handleExpandSearch}
          onCollapse={handleCollapseSearch}
          suggestions={suggestions}
          loading={loading}
          onSuggestionClick={handleSuggestionClick}
        />
      )}

      {/* Expanded search overlay */}
      {viewState === "searching" && (
        <MobileSearchBar
          query={query}
          onQueryChange={onQueryChange}
          isExpanded={true}
          onExpand={handleExpandSearch}
          onCollapse={handleCollapseSearch}
          suggestions={suggestions}
          loading={loading}
          onSuggestionClick={handleSuggestionClick}
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
