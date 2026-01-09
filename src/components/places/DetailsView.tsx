"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Users, MessageSquare, Loader2 } from "lucide-react";
import { Place } from "@/types/database";
import { Button } from "@/components/ui/button";

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

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Server returned an invalid response");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to join place");
      }

      // Redirect to messages view for this place
      router.push(`/messages/place/${place.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join place");
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Back Button with hover effect */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="group flex items-center gap-2 text-[#6867B0] hover:text-cyan-500 transition-all duration-300 font-semibold -ml-1 animate-[slideRight_0.4s_ease-out] p-0 h-auto hover:bg-transparent"
      >
        <div className="w-8 h-8 rounded-full bg-[#6867B0]/10 group-hover:bg-gradient-to-br group-hover:from-[#6867B0] group-hover:to-cyan-400 flex items-center justify-center transition-all duration-300">
          <ArrowLeft size={18} className="group-hover:text-white transition-colors" strokeWidth={2.5} />
        </div>
        <span className="text-sm">Back to search</span>
      </Button>

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
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
              <Users className="text-white" size={16} strokeWidth={2.5} />
              <span className="text-white font-bold text-sm">{place.member_count}</span>
            </div>
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
              <MessageSquare className="text-white" size={16} strokeWidth={2.5} />
              <span className="text-white font-bold text-sm">{place.message_count}</span>
            </div>
            {place.rating && (
              <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg">
                <span className="text-yellow-300 text-sm">★</span>
                <span className="text-white font-bold text-sm">{place.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Place Info with gradient accent */}
      <div className="space-y-3 animate-[slideUp_0.5s_ease-out]" style={{ animationDelay: '0.1s' }}>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[#6867B0] to-cyan-500 bg-clip-text text-transparent mb-2 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {place.name}
          </h2>
          {place.formatted_address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin size={18} className="text-[#6867B0] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
              <p className="text-sm font-medium leading-relaxed">{place.formatted_address}</p>
            </div>
          )}
        </div>

        {/* Stats cards for no-photo scenario */}
        {!place.cached_photo_url && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-[#6867B0]/10 to-cyan-400/10 rounded-xl p-3 text-center border border-[#6867B0]/20">
              <Users className="text-[#6867B0] mx-auto mb-1" size={20} strokeWidth={2.5} />
              <p className="text-xs text-muted-foreground font-medium">Members</p>
              <p className="text-lg font-bold text-foreground">{place.member_count}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-400/10 to-[#6867B0]/10 rounded-xl p-3 text-center border border-cyan-400/20">
              <MessageSquare className="text-cyan-500 mx-auto mb-1" size={20} strokeWidth={2.5} />
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

      {/* Error Message with modern design */}
      {error && (
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200 rounded-2xl p-4 animate-[shake_0.5s_ease-out]">
          <p className="text-destructive text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Join Button with gradient and animation */}
      <div className="pt-2 animate-[slideUp_0.6s_ease-out]" style={{ animationDelay: '0.2s' }}>
        <Button
          onClick={handleJoinPlace}
          disabled={loading}
          className="group relative w-full bg-gradient-to-r from-[#6867B0] to-cyan-500 hover:from-[#6867B0]/90 hover:to-cyan-400 text-white font-bold h-14 rounded-2xl overflow-hidden shadow-xl shadow-[#6867B0]/30 hover:shadow-2xl hover:shadow-cyan-500/40 transition-all duration-300 border-0 hover:scale-[1.02]"
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
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Button>
      </div>
    </div>
  );
}
