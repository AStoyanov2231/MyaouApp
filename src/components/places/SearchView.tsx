import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Search, MapPin, Loader2 } from "lucide-react";

import { AutocompletePrediction } from "@/types/google-places";

type SearchViewProps = {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: AutocompletePrediction[];
  loading: boolean;
  onSuggestionClick: (prediction: AutocompletePrediction) => void;
};

export function SearchView({
  query,
  onQueryChange,
  suggestions,
  loading,
  onSuggestionClick,
}: SearchViewProps) {
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-3xl font-bold gradient-brand-text animate-[slideDown_0.4s_ease-out]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Discover Places
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Input with elevated design */}
        <div className="relative animate-[slideDown_0.5s_ease-out]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <Input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search cafes, parks, venues..."
            className="w-full pl-12 pr-4 h-14 border-2 border-transparent rounded-2xl focus:border-primary bg-gradient-to-br from-muted/50 to-background shadow-lg shadow-muted/50 transition-all duration-300 hover:shadow-xl hover:shadow-muted placeholder:text-muted-foreground font-medium"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12 animate-[fadeIn_0.3s_ease-out]">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 blur-xl gradient-brand-subtle animate-pulse" />
            </div>
          </div>
        )}

        {/* Results List */}
        {!loading && (
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {suggestions.length === 0 ? (
              <div className="text-center py-16 px-4 animate-[fadeIn_0.4s_ease-out]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-brand-subtle flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <p className="text-muted-foreground text-sm font-medium">No suggestions found</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              suggestions.map((suggestion, index) => (
                <Button
                  key={suggestion.place_id}
                  variant="ghost"
                  onClick={() => onSuggestionClick(suggestion)}
                  className="group w-full p-4 h-auto text-left rounded-xl hover:gradient-brand-subtle border border-transparent hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 animate-[slideUp_0.4s_ease-out] backdrop-blur-sm justify-start"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="mt-0.5 w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {suggestion.structured_formatting.main_text}
                      </h3>
                      {suggestion.structured_formatting.secondary_text && (
                        <p className="text-xs text-muted-foreground line-clamp-1 font-medium">
                          {suggestion.structured_formatting.secondary_text}
                        </p>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0">
                      <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
