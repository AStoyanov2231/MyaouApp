"use client";

import { Loader2 } from "lucide-react";

import { Place } from "@/types/database";

import { MapContainer } from "./MapContainer";
import { MobileBottomPanel } from "./MobileBottomPanel";

type MobilePlacesViewProps = {
  selectedPlace: Place | null;
  mapCenter: [number, number] | null;
  nearbyPlaces: Place[];
  loading: boolean;
  onPlaceSelect: (place: Place) => void;
  onBack: () => void;
  userLocation: [number, number] | null;
  locationPermission: boolean | null;
  searchRadius?: number;
};

export function MobilePlacesView({
  selectedPlace,
  mapCenter,
  nearbyPlaces,
  loading,
  onPlaceSelect,
  onBack,
  userLocation,
  locationPermission,
  searchRadius = 50,
}: MobilePlacesViewProps) {
  const showLocationPrompt = locationPermission === false || !mapCenter;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Full-screen map with bubble markers */}
      <div className="absolute inset-0 z-0">
        {showLocationPrompt ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-4">
            {locationPermission === null ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Requesting location...</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground font-medium text-lg">Enable location to see nearby places</p>
                <p className="text-muted-foreground text-sm text-center px-8">We need your location to show places around you</p>
              </>
            )}
          </div>
        ) : (
          <MapContainer
            places={nearbyPlaces}
            center={mapCenter}
            zoom={18}
            selectedPlace={selectedPlace}
            onMarkerClick={onPlaceSelect}
            userLocation={userLocation}
            searchRadius={searchRadius}
          />
        )}
      </div>

      {/* Loading indicator */}
      {loading && mapCenter && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Finding nearby places...</span>
        </div>
      )}

      {/* Bottom panel for place details */}
      {selectedPlace && (
        <MobileBottomPanel
          place={selectedPlace}
          onClose={onBack}
        />
      )}
    </div>
  );
}
