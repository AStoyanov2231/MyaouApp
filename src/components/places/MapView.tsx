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

// Custom icon for selected marker
const selectedIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [0, -48],
  className: "selected-marker",
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

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      className="w-full h-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />
      {validPlaces.map((place) => {
        const isSelected = selectedPlace?.id === place.id;
        return (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            {...(isSelected && { icon: selectedIcon })}
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
    </MapContainer>
  );
}
