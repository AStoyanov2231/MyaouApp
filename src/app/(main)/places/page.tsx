"use client";
import { useEffect, useState } from "react";
import { Search, MapPin, Users, MessageSquare } from "lucide-react";
import { Input, Spinner } from "@/components/ui";
import { usePlaces } from "@/hooks/usePlaces";
import Link from "next/link";

export default function PlacesPage() {
  const { places, loading, search, fetchPopular } = usePlaces();
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchPopular();
  }, [fetchPopular]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) search(query);
      else if (query.length === 0) fetchPopular();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, fetchPopular]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Discover Places</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for places..."
          className="pl-10"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {places.map((place) => (
          <Link
            key={place.id}
            href={`/places/${place.id}`}
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-1">{place.name}</h3>
            {place.formatted_address && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                <MapPin size={14} />
                {place.formatted_address}
              </p>
            )}
            <div className="flex gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Users size={14} />
                {place.member_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare size={14} />
                {place.message_count}
              </span>
              {place.rating && (
                <span className="text-yellow-500">★ {place.rating.toFixed(1)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {!loading && places.length === 0 && (
        <p className="text-center text-gray-500 py-8">No places found</p>
      )}
    </div>
  );
}
