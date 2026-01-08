"use client";
import { useState, useEffect, use } from "react";
import { MapPin, UserPlus, Check, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { Profile, Friendship } from "@/types/database";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

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
      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
        </Card>
      </div>
    );
  }

  const isOwnProfile = user?.id === userId;
  const isFriend = friendship?.status === "accepted";
  const isPending = friendship?.status === "pending";

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {getInitials(profile.display_name || profile.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.location_text && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
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
        {profile.bio && <p className="text-foreground">{profile.bio}</p>}
      </Card>
    </div>
  );
}
