"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, MessageSquare } from "lucide-react";
import { Place } from "@/types/database";

type PlaceCardProps = {
  place: Place;
};

export function PlaceCard({ place }: PlaceCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/places/${place.id}/join`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to join place");
      }

      router.push(`/messages/place/${place.id}`);
    } catch (err) {
      console.error("Failed to join place:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full text-left bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
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
      {loading && (
        <div className="mt-2 text-xs text-gray-500">Joining...</div>
      )}
    </button>
  );
}
