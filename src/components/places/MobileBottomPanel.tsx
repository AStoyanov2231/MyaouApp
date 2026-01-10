"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { X, MapPin, Users, MessageSquare, Loader2, AlertCircle } from "lucide-react";

import { Place } from "@/types/database";

type MobileBottomPanelProps = {
  place: Place;
  onClose: () => void;
};

export function MobileBottomPanel({ place, onClose }: MobileBottomPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinPlace = async () => {
    try {
      setLoading(true);
      setError("");

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

      if (!response.ok) {
        throw new Error(data.error || "Failed to join place");
      }

      router.push(`/messages/place/${data.placeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join place");
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 animate-[slideUpPanel_0.3s_ease-out]">
      {/* Panel container */}
      <div className="bg-card rounded-t-3xl shadow-2xl shadow-black/20 max-h-[60vh] overflow-hidden flex flex-col">
        {/* Drag handle and close button */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
          <div className="flex-1" />
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          <div className="flex-1 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto custom-scrollbar">
          {/* Place image */}
          {place.cached_photo_url && (
            <div className="relative h-32 overflow-hidden mx-4 rounded-xl">
              <img
                src={place.cached_photo_url}
                alt={place.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Stats badges on image */}
              <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30 px-2 py-1 flex items-center gap-1.5 shadow-lg">
                  <Users className="h-3 w-3 text-white" />
                  <span className="text-white font-semibold text-xs">{place.member_count}</span>
                </Badge>
                <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30 px-2 py-1 flex items-center gap-1.5 shadow-lg">
                  <MessageSquare className="h-3 w-3 text-white" />
                  <span className="text-white font-semibold text-xs">{place.message_count}</span>
                </Badge>
                {place.rating && (
                  <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30 px-2 py-1 flex items-center gap-1 shadow-lg">
                    <span className="text-yellow-300 text-xs">★</span>
                    <span className="text-white font-semibold text-xs">{place.rating.toFixed(1)}</span>
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Place info */}
          <div className="p-4 space-y-3">
            <div>
              <h2
                className="text-xl font-bold gradient-brand-text leading-tight mb-1"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {place.name}
              </h2>
              {place.formatted_address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed line-clamp-2">{place.formatted_address}</p>
                </div>
              )}
            </div>

            {/* Stats row for no-photo scenario */}
            {!place.cached_photo_url && (
              <div className="flex gap-3">
                <Badge variant="secondary" className="bg-primary/10 border-primary/20 px-3 py-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-sm">{place.member_count}</span>
                </Badge>
                <Badge variant="secondary" className="bg-accent/10 border-accent/20 px-3 py-1.5 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-accent" />
                  <span className="font-semibold text-sm">{place.message_count}</span>
                </Badge>
                {place.rating && (
                  <Badge variant="secondary" className="bg-yellow-400/10 border-yellow-400/20 px-3 py-1.5 flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold text-sm">{place.rating.toFixed(1)}</span>
                  </Badge>
                )}
              </div>
            )}

            {/* Error alert */}
            {error && (
              <Alert variant="destructive" className="animate-[shake_0.5s_ease-out]">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Join button */}
            <Button
              onClick={handleJoinPlace}
              disabled={loading}
              className="group relative w-full gradient-brand hover:opacity-90 text-white font-bold h-12 rounded-xl overflow-hidden shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-accent/30 transition-all duration-300 border-0"
            >
              <span className="relative z-10 flex items-center justify-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Join Place
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
