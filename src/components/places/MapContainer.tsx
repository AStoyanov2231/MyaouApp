"use client";
import dynamic from "next/dynamic";
import { Place } from "@/types/database";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
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
