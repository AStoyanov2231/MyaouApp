import { Place } from "@/types/database";
import { SearchView } from "./SearchView";
import { DetailsView } from "./DetailsView";

type FloatingOverlayProps = {
  mode: "search" | "details";
  selectedPlace: Place | null;
  query: string;
  onQueryChange: (query: string) => void;
  places: Place[];
  loading: boolean;
  onPlaceSelect: (place: Place) => void;
  onBack: () => void;
};

export function FloatingOverlay({
  mode,
  selectedPlace,
  query,
  onQueryChange,
  places,
  loading,
  onPlaceSelect,
  onBack,
}: FloatingOverlayProps) {
  return (
    <div className="absolute top-6 left-6 z-50 w-[400px] max-w-[calc(100%-3rem)] max-h-[calc(100vh-3rem)] bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
      {mode === "search" ? (
        <SearchView
          query={query}
          onQueryChange={onQueryChange}
          places={places}
          loading={loading}
          onPlaceClick={onPlaceSelect}
        />
      ) : (
        selectedPlace && <DetailsView place={selectedPlace} onBack={onBack} />
      )}
    </div>
  );
}
