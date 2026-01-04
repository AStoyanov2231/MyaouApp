"use client";
import { useState, useEffect, use } from "react";
import { MapPin, UserPlus, Check, Clock } from "lucide-react";
import { Button, Avatar, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import type { Profile, Friendship } from "@/types/database";

export default function UserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profile/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setFriendship(d.friendship);
        setLoading(false);
      });
  }, [userId]);

  const handleFriendRequest = async () => {
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressee_id: userId }),
    });
    const data = await res.json();
    setFriendship(data.friendship);
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;
  const isFriend = friendship?.status === "accepted";
  const isPending = friendship?.status === "pending";

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-4 mb-6">
          <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="lg" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-gray-500">@{profile.username}</p>
            {profile.location_text && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin size={14} /> {profile.location_text}
              </p>
            )}
          </div>
          {!isOwnProfile && (
            <div>
              {isFriend ? (
                <Button variant="secondary" size="sm" disabled>
                  <Check size={16} className="mr-1" /> Friends
                </Button>
              ) : isPending ? (
                <Button variant="secondary" size="sm" disabled>
                  <Clock size={16} className="mr-1" /> Pending
                </Button>
              ) : (
                <Button size="sm" onClick={handleFriendRequest}>
                  <UserPlus size={16} className="mr-1" /> Add Friend
                </Button>
              )}
            </div>
          )}
        </div>
        {profile.bio && <p className="text-gray-700">{profile.bio}</p>}
      </div>
    </div>
  );
}
