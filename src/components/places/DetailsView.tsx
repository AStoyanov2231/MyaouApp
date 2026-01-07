import Link from "next/link";
import { ArrowLeft, MapPin, Users, MessageSquare } from "lucide-react";
import { Place } from "@/types/database";
import { Button } from "@/components/ui";

type DetailsViewProps = {
  place: Place;
  onBack: () => void;
};

export function DetailsView({ place, onBack }: DetailsViewProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[#6867B0] hover:text-[#6867B0]/80 transition-colors font-medium"
      >
        <ArrowLeft size={20} />
        <span>Back to search</span>
      </button>

      {/* Photo */}
      {place.cached_photo_url && (
        <img
          src={place.cached_photo_url}
          alt={place.name}
          className="w-full h-48 object-cover rounded-xl"
        />
      )}

      {/* Place Info */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{place.name}</h2>
        {place.formatted_address && (
          <p className="text-gray-600 flex items-center gap-1 text-sm">
            <MapPin size={16} />
            {place.formatted_address}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <Users size={16} />
          {place.member_count} members
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={16} />
          {place.message_count} messages
        </span>
        {place.rating && (
          <span className="text-yellow-500">★ {place.rating.toFixed(1)}</span>
        )}
      </div>

      {/* Join Button */}
      <Link href={`/places/${place.id}`} className="block">
        <Button className="w-full !bg-cyan-400 hover:!bg-cyan-500 !text-gray-900 font-semibold">
          Join Place
        </Button>
      </Link>
    </div>
  );
}
