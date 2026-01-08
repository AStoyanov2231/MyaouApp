"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import { Place } from "@/types/database";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  ),
});

type MapContainerProps = {
  places: Place[];
  center: [number, number];
  zoom: number;
  selectedPlace: Place | null;
  onMarkerClick: (place: Place) => void;
};

export function MapContainer({
  places,
  center,
  zoom,
  selectedPlace,
  onMarkerClick,
}: MapContainerProps) {
  return (
    <div className="w-full h-full relative z-0">
      <MapView
        places={places}
        center={center}
        zoom={zoom}
        selectedPlace={selectedPlace}
        onMarkerClick={onMarkerClick}
      />
    </div>
  );
}
