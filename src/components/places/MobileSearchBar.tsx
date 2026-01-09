"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Search,
  MapPin,
  Loader2,
  Coffee,
  UtensilsCrossed,
  Wine,
  Beer,
  ShoppingBag,
  Building2,
  Trees,
  Dumbbell,
  GraduationCap,
  Stethoscope,
  Hotel
} from "lucide-react";

import { AutocompletePrediction } from "@/types/google-places";

// Get icon component based on place types
function getPlaceIcon(types?: string[]) {
  if (!types || types.length === 0) return MapPin;

  // Check for specific types (order matters - more specific first)
  if (types.some(t => t.includes("cafe") || t.includes("coffee"))) return Coffee;
  if (types.some(t => t.includes("bar") || t.includes("night_club"))) return Wine;
  if (types.some(t => t.includes("restaurant") || t.includes("food"))) return UtensilsCrossed;
  if (types.some(t => t.includes("brewery") || t.includes("pub"))) return Beer;
  if (types.some(t => t.includes("shopping") || t.includes("store") || t.includes("shop"))) return ShoppingBag;
  if (types.some(t => t.includes("park") || t.includes("garden"))) return Trees;
  if (types.some(t => t.includes("gym") || t.includes("fitness"))) return Dumbbell;
  if (types.some(t => t.includes("school") || t.includes("university") || t.includes("education"))) return GraduationCap;
  if (types.some(t => t.includes("hospital") || t.includes("doctor") || t.includes("health"))) return Stethoscope;
  if (types.some(t => t.includes("hotel") || t.includes("lodging"))) return Hotel;
  if (types.some(t => t.includes("establishment"))) return Building2;

  return MapPin;
}

type MobileSearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: AutocompletePrediction[];
  loading: boolean;
  onSuggestionClick: (prediction: AutocompletePrediction) => void;
};

export function MobileSearchBar({
  query,
  onQueryChange,
  suggestions,
  loading,
  onSuggestionClick,
}: MobileSearchBarProps) {
  // Limit to 5 suggestions
  const displaySuggestions = suggestions.slice(0, 5);
  const hasResults = query.length >= 2 && (loading || displaySuggestions.length > 0);

  return (
    <div className="absolute top-0 left-0 right-0 z-30 p-4">
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-black/10 border border-border/50">
        <div className="p-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <Input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search places..."
              className="w-full pl-12 pr-4 h-12 border-0 rounded-xl bg-muted/50 transition-all duration-300 placeholder:text-muted-foreground font-medium focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Results - only show when there's content */}
          {hasResults && (
            <div className="mt-3 space-y-1 animate-[fadeIn_0.2s_ease-out]">
              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {/* Suggestions List */}
              {!loading && displaySuggestions.map((suggestion, index) => {
                const Icon = getPlaceIcon(suggestion.types);
                return (
                  <Button
                    key={suggestion.place_id}
                    variant="ghost"
                    onClick={() => onSuggestionClick(suggestion)}
                    className="group w-full p-3 h-auto text-left rounded-xl bg-transparent border-2 border-transparent hover:border-primary hover:bg-transparent transition-all duration-200 justify-start animate-[slideUp_0.3s_ease-out_forwards] opacity-0"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center transition-all duration-200 flex-shrink-0">
                        <Icon className="h-4 w-4 text-primary group-hover:text-white transition-colors duration-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {suggestion.structured_formatting.main_text}
                        </h3>
                        {suggestion.structured_formatting.secondary_text && (
                          <p className="text-xs text-muted-foreground truncate">
                            {suggestion.structured_formatting.secondary_text}
                          </p>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
