import { Search, MapPin } from "lucide-react";
import { Place } from "@/types/database";
import { Spinner } from "@/components/ui";

type SearchViewProps = {
  query: string;
  onQueryChange: (query: string) => void;
  places: Place[];
  loading: boolean;
  onPlaceClick: (place: Place) => void;
};

export function SearchView({
  query,
  onQueryChange,
  places,
  loading,
  onPlaceClick,
}: SearchViewProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-3">Discover Places</h2>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6867B0]" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search for places..."
          className="w-full pl-10 pr-4 py-3 border border-[#6867B0]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6867B0] bg-white shadow-sm"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {/* Results List */}
      {!loading && (
        <div className="max-h-[400px] overflow-y-auto">
          {places.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">
              No places found
            </p>
          ) : (
            places.map((place) => (
              <button
                key={place.id}
                onClick={() => onPlaceClick(place)}
                className="w-full p-3 text-left hover:bg-[#6867B0]/10 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <h3 className="font-semibold text-sm mb-1">{place.name}</h3>
                {place.formatted_address && (
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin size={12} />
                    {place.formatted_address}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
