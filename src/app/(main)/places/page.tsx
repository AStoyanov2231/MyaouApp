"use client";
import { useEffect, useState, useRef } from "react";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useIsPremium } from "@/stores/selectors";
import { Place } from "@/types/database";
import { MapContainer } from "@/components/places/MapContainer";
import { MobilePlacesView } from "@/components/places/MobilePlacesView";
import { DetailsView } from "@/components/places/DetailsView";
import { Loader2 } from "lucide-react";

export default function PlacesPage() {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  // Premium users get 200m radius, free users get 50m
  const isPremium = useIsPremium();
  const searchRadius = isPremium ? 200 : 50;

  // Fetch nearby places based on user location
  const { places: nearbyPlaces, loading, refetch } = useNearbyPlaces(userLocation, { radius: searchRadius });

  // Refetch when premium status changes (e.g., profile loads after initial fetch)
  const prevRadiusRef = useRef(searchRadius);
  useEffect(() => {
    if (prevRadiusRef.current !== searchRadius && userLocation) {
      prevRadiusRef.current = searchRadius;
      refetch();
    }
  }, [searchRadius, userLocation, refetch]);

  // Detect desktop to conditionally render map (prevents Leaflet errors on mobile)
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Watch geolocation continuously for location updates
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermission(false);
      return;
    }

    // Get initial position quickly
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(coords);
        setLocationPermission(true);
      },
      () => {
        setLocationPermission(false);
      }
    );

    // Watch for continuous location updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(coords);
        setLocationPermission(true);
      },
      () => {
        // Don't set permission to false on watch error - initial position may have succeeded
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Accept cached position up to 10 seconds old
        timeout: 30000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Update map center when user location is available
  useEffect(() => {
    if (userLocation && !mapCenter) {
      setMapCenter(userLocation);
    }
  }, [userLocation, mapCenter]);

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    // Center map on selected place
    if (place.latitude && place.longitude) {
      setMapCenter([place.latitude, place.longitude]);
    }
  };

  const handleBack = () => {
    setSelectedPlace(null);
    // Re-center on user location
    if (userLocation) {
      setMapCenter(userLocation);
    }
  };

  // Show enable location message if no permission or still waiting
  const showLocationPrompt = locationPermission === false || (!userLocation && locationPermission === null);

  return (
    <>
      {/* Desktop View: Map with bubble markers */}
      {isDesktop && (
        <div className="flex flex-1 relative h-screen">
          {showLocationPrompt || !mapCenter ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-4">
              {locationPermission === null ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground font-medium">Requesting location...</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground font-medium text-lg">Enable location to see nearby places</p>
                  <p className="text-muted-foreground text-sm">We need your location to show places around you</p>
                </>
              )}
            </div>
          ) : (
            <MapContainer
              places={nearbyPlaces}
              center={mapCenter}
              zoom={18}
              selectedPlace={selectedPlace}
              onMarkerClick={handlePlaceSelect}
              userLocation={userLocation}
              searchRadius={searchRadius}
            />
          )}

          {/* Loading indicator */}
          {loading && mapCenter && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Finding nearby places...</span>
            </div>
          )}

          {/* Details panel when place selected */}
          {selectedPlace && (
            <div className="absolute right-4 top-4 bottom-4 w-96 z-20">
              <DetailsView place={selectedPlace} onBack={handleBack} />
            </div>
          )}
        </div>
      )}

      {/* Mobile View: Full-screen map with bubble markers */}
      {!isDesktop && (
        <MobilePlacesView
          selectedPlace={selectedPlace}
          mapCenter={mapCenter}
          nearbyPlaces={nearbyPlaces}
          loading={loading}
          onPlaceSelect={handlePlaceSelect}
          onBack={handleBack}
          userLocation={userLocation}
          locationPermission={locationPermission}
          searchRadius={searchRadius}
        />
      )}
    </>
  );
}
