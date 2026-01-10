"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, Loader2 } from "lucide-react";
import { Place } from "@/types/database";

type PlacePanelCardProps = {
  place: Place;
  index: number;
  showMemberCount?: boolean;
};

export function PlacePanelCard({ place, index, showMemberCount }: PlacePanelCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/places/${place.google_place_id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: place.name,
          formatted_address: place.formatted_address,
          latitude: place.latitude,
          longitude: place.longitude,
          place_types: place.place_types,
          photo_reference: place.photo_reference,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        router.push(`/messages/place/${data.placeId}`);
      } else {
        console.error("Failed to join place:", data.error);
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to join place:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="group w-full p-3 text-left rounded-xl bg-transparent border border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-200 animate-[slideUp_0.3s_ease-out_forwards] opacity-0 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center gap-3 w-full">
        {/* Photo or icon */}
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-primary/10">
          {place.cached_photo_url ? (
            <img
              src={place.cached_photo_url}
              alt={place.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {place.name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {showMemberCount && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {place.member_count}
              </span>
            )}
            {place.formatted_address && (
              <span className="truncate">
                {place.formatted_address.split(",")[0]}
              </span>
            )}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
        )}
      </div>
    </button>
  );
}
