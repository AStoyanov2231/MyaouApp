import { Place } from "@/types/database";
import { AutocompletePrediction } from "@/types/google-places";

import { SearchView } from "./SearchView";
import { DetailsView } from "./DetailsView";

import { Loader2 } from "lucide-react";

type FloatingOverlayProps = {
  mode: "search" | "loading" | "details";
  selectedPlace: Place | null;
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: AutocompletePrediction[];
  loading: boolean;
  onSuggestionClick: (prediction: AutocompletePrediction) => void;
  onBack: () => void;
};

export function FloatingOverlay({
  mode,
  selectedPlace,
  query,
  onQueryChange,
  suggestions,
  loading,
  onSuggestionClick,
  onBack,
}: FloatingOverlayProps) {
  return (
    <div className="absolute top-6 left-6 z-50 w-[420px] max-w-[calc(100%-3rem)] max-h-[calc(100vh-3rem)]">
      {/* Gradient border effect */}
      <div className="relative p-[2px] rounded-3xl gradient-brand-border shadow-2xl shadow-primary/20 animate-[fadeIn_0.4s_ease-out]">
        <div className="bg-card rounded-3xl overflow-hidden backdrop-blur-xl h-full">
          <div className="relative overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite_reverse]" />

            {/* Content */}
            <div className="relative z-10">
              {mode === "search" ? (
                <SearchView
                  query={query}
                  onQueryChange={onQueryChange}
                  suggestions={suggestions}
                  loading={loading}
                  onSuggestionClick={onSuggestionClick}
                />
              ) : mode === "loading" ? (
                <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="relative mb-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="absolute inset-0 blur-xl gradient-brand-subtle animate-pulse" />
                  </div>
                  <p className="text-muted-foreground font-semibold text-sm">Loading place details...</p>
                </div>
              ) : (
                selectedPlace && <DetailsView place={selectedPlace} onBack={onBack} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
