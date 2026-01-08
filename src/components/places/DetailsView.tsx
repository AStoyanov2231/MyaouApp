"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ArrowLeft, MapPin, Users, MessageSquare, Loader2, AlertCircle } from "lucide-react";

import { Place } from "@/types/database";

type DetailsViewProps = {
  place: Place;
  onBack: () => void;
};

export function DetailsView({ place, onBack }: DetailsViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoinPlace = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/places/${place.id}/join`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to join place");
      }

      router.push(`/messages/place/${place.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join place");
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="group flex items-center gap-2 text-primary hover:text-accent transition-all duration-300 font-semibold -ml-1 animate-[slideRight_0.4s_ease-out] p-0 h-auto hover:bg-transparent w-fit"
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:gradient-brand flex items-center justify-center transition-all duration-300">
            <ArrowLeft className="h-4 w-4 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm">Back to search</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        {/* Photo with overlay gradient */}
        {place.cached_photo_url && (
          <div className="relative -mx-6 h-56 overflow-hidden animate-[scaleIn_0.5s_ease-out]">
            <img
              src={place.cached_photo_url}
              alt={place.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Floating stats on image */}
            <div className="absolute bottom-4 left-6 right-6 flex gap-3">
              <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30 px-3 py-2 flex items-center gap-2 shadow-lg">
                <Users className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">{place.member_count}</span>
              </Badge>
              <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30 px-3 py-2 flex items-center gap-2 shadow-lg">
                <MessageSquare className="h-4 w-4 text-white" />
                <span className="text-white font-bold text-sm">{place.message_count}</span>
              </Badge>
              {place.rating && (
                <Badge variant="secondary" className="backdrop-blur-xl bg-white/20 border border-white/30 px-3 py-2 flex items-center gap-1.5 shadow-lg">
                  <span className="text-yellow-300 text-sm">★</span>
                  <span className="text-white font-bold text-sm">{place.rating.toFixed(1)}</span>
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Place Info */}
        <div className="space-y-3 animate-[slideUp_0.5s_ease-out]" style={{ animationDelay: '0.1s' }}>
          <div>
            <CardTitle className="text-3xl font-bold gradient-brand-text mb-2 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {place.name}
            </CardTitle>
            {place.formatted_address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{place.formatted_address}</p>
              </div>
            )}
          </div>

          {/* Stats cards for no-photo scenario */}
          {!place.cached_photo_url && (
            <div className="grid grid-cols-3 gap-2">
              <div className="gradient-brand-subtle rounded-xl p-3 text-center border border-primary/20">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground font-medium">Members</p>
                <p className="text-lg font-bold text-foreground">{place.member_count}</p>
              </div>
              <div className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl p-3 text-center border border-accent/20">
                <MessageSquare className="h-5 w-5 text-accent mx-auto mb-1" />
                <p className="text-xs text-muted-foreground font-medium">Messages</p>
                <p className="text-lg font-bold text-foreground">{place.message_count}</p>
              </div>
              {place.rating && (
                <div className="bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-xl p-3 text-center border border-yellow-400/20">
                  <span className="text-2xl">★</span>
                  <p className="text-xs text-muted-foreground font-medium">Rating</p>
                  <p className="text-lg font-bold text-foreground">{place.rating.toFixed(1)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="animate-[shake_0.5s_ease-out]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="pt-2 animate-[slideUp_0.6s_ease-out]" style={{ animationDelay: '0.2s' }}>
        <Button
          onClick={handleJoinPlace}
          disabled={loading}
          className="group relative w-full gradient-brand hover:opacity-90 text-white font-bold h-14 rounded-2xl overflow-hidden shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-accent/40 transition-all duration-300 border-0 hover:scale-[1.02]"
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
      </CardFooter>
    </Card>
  );
}
