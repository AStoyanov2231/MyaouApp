"use client";

import { useRef, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Search, MapPin, Loader2, X } from "lucide-react";

import { AutocompletePrediction } from "@/types/google-places";

type MobileSearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  suggestions: AutocompletePrediction[];
  loading: boolean;
  onSuggestionClick: (prediction: AutocompletePrediction) => void;
};

export function MobileSearchBar({
  query,
  onQueryChange,
  isExpanded,
  onExpand,
  onCollapse,
  suggestions,
  loading,
  onSuggestionClick,
}: MobileSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Collapsed state - simple search bar at top
  if (!isExpanded) {
    return (
      <div className="absolute top-0 left-0 right-0 z-30 p-4">
        <div
          onClick={onExpand}
          className="relative cursor-pointer"
        >
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="w-full pl-12 pr-4 h-12 flex items-center bg-card border border-border rounded-xl shadow-lg shadow-black/10">
            <span className="text-muted-foreground font-medium">
              {query || "Search places..."}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state - full overlay with search results
  return (
    <div className="absolute inset-0 z-40 bg-background flex flex-col animate-[fadeIn_0.2s_ease-out]">
      {/* Header with search input and cancel button */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search cafes, parks, venues..."
            className="w-full pl-12 pr-10 h-12 border-2 border-primary/30 rounded-xl focus:border-primary bg-muted/30 transition-all duration-300 font-medium"
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={onCollapse}
          className="text-primary font-semibold px-3 h-12 hover:bg-primary/10"
        >
          Cancel
        </Button>
      </div>

      {/* Results area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 blur-xl gradient-brand-subtle animate-pulse" />
            </div>
          </div>
        )}

        {/* Suggestions list */}
        {!loading && suggestions.length > 0 && (
          <div className="p-4 space-y-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={suggestion.place_id}
                variant="ghost"
                onClick={() => onSuggestionClick(suggestion)}
                className="group w-full p-4 h-auto text-left rounded-xl hover:gradient-brand-subtle border border-transparent hover:border-primary/20 transition-all duration-200 justify-start animate-[slideUp_0.3s_ease-out]"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200 flex-shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground mb-0.5 group-hover:text-primary transition-colors truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {suggestion.structured_formatting.main_text}
                    </h3>
                    {suggestion.structured_formatting.secondary_text && (
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.structured_formatting.secondary_text}
                      </p>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                    <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}

        {/* Empty state - no query */}
        {!loading && query.length < 2 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-brand-subtle flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground text-center">
              Search for cafes, parks, restaurants...
            </p>
          </div>
        )}

        {/* No results found */}
        {!loading && query.length >= 2 && suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-muted-foreground text-center">
              No places found for "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
