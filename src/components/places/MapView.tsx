"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Place } from "@/types/database";

// Fix Leaflet default marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Brand-colored marker icon for selected place
const brandMarkerIcon = new L.DivIcon({
  className: "brand-marker",
  html: `
    <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30c0-9.94-8.06-18-18-18z" fill="#6867B0"/>
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30c0-9.94-8.06-18-18-18z" fill="url(#gradient)"/>
      <circle cx="18" cy="18" r="8" fill="white"/>
      <defs>
        <linearGradient id="gradient" x1="0" y1="0" x2="36" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#6867B0"/>
          <stop offset="100%" stop-color="#3ECFCF"/>
        </linearGradient>
      </defs>
    </svg>
  `,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  popupAnchor: [0, -48],
});

// Component to handle map recentering when center prop changes
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(center?.[0]) && Number.isFinite(center?.[1])) {
      map.flyTo(center, 15, { duration: 1 });
    }
  }, [center, map]);

  return null;
}

type MapViewProps = {
  places: Place[];
  center: [number, number];
  zoom: number;
  selectedPlace: Place | null;
  onMarkerClick: (place: Place) => void;
};

export default function MapView({
  places,
  center,
  zoom,
  selectedPlace,
  onMarkerClick,
}: MapViewProps) {
  // Filter out places without coordinates
  const validPlaces = places.filter(
    (place) => place.latitude && place.longitude
  );

  // Don't render map until we have valid coordinates
  if (!Number.isFinite(center?.[0]) || !Number.isFinite(center?.[1])) {
    return null;
  }

  // Check if selected place is already in validPlaces
  const selectedInList = selectedPlace && validPlaces.some(p => p.id === selectedPlace.id);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      zoomControl={false}
      className="w-full h-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />

      {/* Render markers for places in the list */}
      {validPlaces.map((place) => {
        const isSelected = selectedPlace?.id === place.id;
        return (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={isSelected ? brandMarkerIcon : undefined}
            eventHandlers={{
              click: () => onMarkerClick(place),
            }}
          >
            <Popup>
              <div className="text-sm">
                <h4 className="font-semibold mb-1">{place.name}</h4>
                {place.formatted_address && (
                  <p className="text-muted-foreground text-xs">{place.formatted_address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Render selected place marker if not in the list */}
      {selectedPlace && !selectedInList && selectedPlace.latitude && selectedPlace.longitude && (
        <Marker
          key={`selected-${selectedPlace.id}`}
          position={[selectedPlace.latitude, selectedPlace.longitude]}
          icon={brandMarkerIcon}
          eventHandlers={{
            click: () => onMarkerClick(selectedPlace),
          }}
        >
          <Popup>
            <div className="text-sm">
              <h4 className="font-semibold mb-1">{selectedPlace.name}</h4>
              {selectedPlace.formatted_address && (
                <p className="text-muted-foreground text-xs">{selectedPlace.formatted_address}</p>
              )}
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
