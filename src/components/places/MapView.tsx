"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { Place } from "@/types/database";

// Component to handle map recentering when center prop changes
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(center?.[0]) && Number.isFinite(center?.[1])) {
      map.flyTo(center, 18, { duration: 1 }); // Zoom 18 to show full 50m radius circle
    }
  }, [center, map]);

  return null;
}

// Get place type icon (emoji-based for simplicity)
function getPlaceTypeIcon(types: string[]): string {
  if (types.includes("cafe") || types.includes("coffee_shop")) return "☕";
  if (types.includes("restaurant") || types.includes("food")) return "🍽️";
  if (types.includes("bar") || types.includes("night_club")) return "🍺";
  if (types.includes("gym") || types.includes("fitness_center")) return "💪";
  if (types.includes("park")) return "🌳";
  if (types.includes("shopping_mall") || types.includes("store")) return "🛍️";
  if (types.includes("school") || types.includes("university")) return "🎓";
  if (types.includes("hospital") || types.includes("doctor")) return "🏥";
  if (types.includes("library")) return "📚";
  if (types.includes("movie_theater")) return "🎬";
  if (types.includes("museum")) return "🏛️";
  if (types.includes("church") || types.includes("place_of_worship")) return "⛪";
  return "📍";
}

// Create bubble icon for a place
function createBubbleIcon(place: Place, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 56 : 48;
  const borderColor = isSelected ? "#6867B0" : "#e5e7eb";
  const borderWidth = isSelected ? 3 : 2;
  const shadow = isSelected
    ? "0 4px 12px rgba(104, 103, 176, 0.4)"
    : "0 2px 8px rgba(0,0,0,0.15)";
  const icon = getPlaceTypeIcon(place.place_types || []);
  const memberCount = place.member_count || 0;

  // Background: photo or gradient (validate URL to prevent XSS)
  const photoUrl = place.cached_photo_url;
  const isValidPhotoUrl = photoUrl && /^https?:\/\/[^\s"'<>]+$/.test(photoUrl);
  const bgStyle = isValidPhotoUrl
    ? `background-image: url(${encodeURI(photoUrl)}); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, #6867B0 0%, #3ECFCF 100%);`;

  const html = `
    <div class="bubble-marker ${isSelected ? "selected" : ""}" style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${borderWidth}px solid ${borderColor};
      ${bgStyle}
      box-shadow: ${shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
    ">
      ${!place.cached_photo_url ? `<span style="font-size: ${isSelected ? 24 : 20}px;">${icon}</span>` : ""}
      ${memberCount > 0 ? `
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          background: #6867B0;
          color: white;
          font-size: 10px;
          font-weight: 600;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        ">${memberCount}</div>
      ` : ""}
    </div>
  `;

  return new L.DivIcon({
    className: "bubble-marker-container",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Custom hook to create user location icon
function useUserIcon() {
  const [userIcon, setUserIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    const icon = new L.DivIcon({
      className: "user-marker",
      html: `<div style="display:flex;flex-direction:column;align-items:center"><span style="font-size:12px;font-weight:600;color:#6867B0">You</span><div style="width:14px;height:14px;background:#6867B0;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(104,103,176,0.5)"></div></div>`,
      iconSize: [40, 34],
      iconAnchor: [20, 34],
    });
    setUserIcon(icon);
  }, []);

  return userIcon;
}

type MapViewProps = {
  places: Place[];
  center: [number, number];
  zoom: number;
  selectedPlace: Place | null;
  onMarkerClick: (place: Place) => void;
  userLocation: [number, number] | null;
  searchRadius?: number; // in meters, default 50
};

export default function MapView({
  places,
  center,
  zoom,
  selectedPlace,
  onMarkerClick,
  userLocation,
  searchRadius = 50,
}: MapViewProps) {
  const userIcon = useUserIcon();

  // Filter out places without valid coordinates
  const validPlaces = places.filter(
    (place) =>
      typeof place.latitude === "number" &&
      typeof place.longitude === "number" &&
      Number.isFinite(place.latitude) &&
      Number.isFinite(place.longitude)
  );

  // Don't render map until we have valid coordinates
  if (!Number.isFinite(center?.[0]) || !Number.isFinite(center?.[1])) {
    return null;
  }

  // Check if selected place is already in validPlaces
  const selectedInList = selectedPlace && validPlaces.some(p => p.id === selectedPlace.id || p.google_place_id === selectedPlace.google_place_id);

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
        maxZoom={19}
      />
      <RecenterMap center={center} />

      {/* User search radius circle */}
      {userLocation && (
        <Circle
          center={userLocation}
          radius={searchRadius}
          pathOptions={{
            color: "#6867B0",
            fillColor: "#6867B0",
            fillOpacity: 0.1,
            weight: 2,
            dashArray: "5, 5",
          }}
        />
      )}

      {/* User location marker */}
      {userIcon && userLocation && (
        <Marker position={userLocation} icon={userIcon} />
      )}

      {/* Render bubble markers for nearby places */}
      {validPlaces.map((place) => {
        const isSelected = selectedPlace?.id === place.id || selectedPlace?.google_place_id === place.google_place_id;
        return (
          <Marker
            key={place.id ?? `google-${place.google_place_id}`}
            position={[place.latitude, place.longitude]}
            icon={createBubbleIcon(place, isSelected)}
            eventHandlers={{
              click: () => onMarkerClick(place),
            }}
          />
        );
      })}

      {/* Render selected place bubble if not in the nearby list */}
      {selectedPlace && !selectedInList && selectedPlace.latitude && selectedPlace.longitude && (
        <Marker
          key={`selected-${selectedPlace.id || selectedPlace.google_place_id}`}
          position={[selectedPlace.latitude, selectedPlace.longitude]}
          icon={createBubbleIcon(selectedPlace, true)}
          eventHandlers={{
            click: () => onMarkerClick(selectedPlace),
          }}
        />
      )}
    </MapContainer>
  );
}
