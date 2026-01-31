"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Clock, Check, Loader2, MapPin, MessageCircle, Crown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { ProfileStats } from "./ProfileStats";
import { ProfileInterests } from "./ProfileInterests";
import { OtherUserGallery } from "./OtherUserGallery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Profile,
  ProfilePhoto,
  ProfileInterest,
  ProfileStats as ProfileStatsType,
  Friendship,
} from "@/types/database";

interface OtherProfileClientProps {
  profile: Profile;
  photos: ProfilePhoto[];
  interests: ProfileInterest[];
  stats: ProfileStatsType;
  friendship: Friendship | null;
  currentUserId: string;
  viewerIsPremium: boolean;
}

function getInitials(name: string) {
  if (!name || name.length === 0) return "?";
  return name.slice(0, 2).toUpperCase();
}

export function OtherProfileClient({
  profile,
  photos,
  interests,
  stats,
  friendship: initialFriendship,
  currentUserId,
  viewerIsPremium,
}: OtherProfileClientProps) {
  const router = useRouter();
  const [friendship, setFriendship] = useState(initialFriendship);
  const [isPending, startTransition] = useTransition();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const getFriendshipStatus = () => {
    if (!friendship) return "none";
    if (friendship.status === "accepted") return "friends";
    if (friendship.status === "pending") {
      // Check if current user sent the request
      if (friendship.requester_id === currentUserId) return "pending_sent";
      return "pending_received";
    }
    return "none";
  };

  const status = getFriendshipStatus();

  const handleSendRequest = () => {
    startTransition(async () => {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressee_id: profile.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setFriendship(data.friendship);
      } else if (res.status === 403) {
        const data = await res.json();
        if (data.error === "FRIEND_LIMIT_REACHED") {
          setUpgradeMessage(data.message);
          setShowUpgradeDialog(true);
        }
      }
    });
  };

  const handleDirectMessage = () => {
    startTransition(async () => {
      const res = await fetch("/api/dm/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/messages/${data.thread_id}`);
      } else if (res.status === 403) {
        try {
          const data = await res.json();
          setUpgradeMessage(data.error || "Could not start conversation");
          setShowUpgradeDialog(true);
        } catch {
          // Non-JSON response, ignore
        }
      }
    });
  };

  const handleAcceptRequest = () => {
    if (!friendship) return;

    startTransition(async () => {
      const res = await fetch(`/api/friends/${friendship.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });

      if (res.ok) {
        setFriendship((prev) => (prev ? { ...prev, status: "accepted" } : null));
      } else if (res.status === 403) {
        const data = await res.json();
        if (data.error === "FRIEND_LIMIT_REACHED" || data.error === "REQUESTER_LIMIT_REACHED") {
          setUpgradeMessage(data.message);
          setShowUpgradeDialog(true);
        }
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      <Card className="overflow-hidden">
        {/* Header with gradient */}
        <div className="relative">
          <div className="h-24 md:h-32 gradient-brand rounded-t-2xl" />

          <div className="px-4 md:px-6 pb-6">
            {/* Avatar section */}
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16">
              <div className="relative mx-auto md:mx-0">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                  <AvatarImage
                    src={profile.avatar_url || undefined}
                    alt={profile.display_name || profile.username}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl md:text-3xl font-semibold">
                    {getInitials(profile.display_name || profile.username)}
                  </AvatarFallback>
                </Avatar>

                {/* Online indicator */}
                {profile.is_online && (
                  <div className="absolute bottom-2 right-2 h-4 w-4 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>

              {/* Name and info section */}
              <div className="flex-1 text-center md:text-left md:pb-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold font-['Outfit'] gradient-brand-text">
                    {profile.display_name || profile.username}
                  </h1>
                  {profile.is_premium && <PremiumBadge size="sm" />}
                </div>
                <p className="text-muted-foreground">@{profile.username}</p>
                {profile.location_text && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center md:justify-start mt-1">
                    <MapPin className="h-4 w-4" /> {profile.location_text}
                  </p>
                )}
              </div>

              {/* Friend button */}
              <div className="flex justify-center md:justify-end gap-2">
                {status === "none" && (
                  <>
                    <Button
                      onClick={handleSendRequest}
                      disabled={isPending}
                      className="min-w-[120px]"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Add Friend
                    </Button>
                    {viewerIsPremium && (
                      <Button
                        variant="outline"
                        onClick={handleDirectMessage}
                        disabled={isPending}
                        className="min-w-[120px]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Direct Message
                      </Button>
                    )}
                  </>
                )}

                {status === "pending_sent" && (
                  <Button variant="secondary" disabled className="min-w-[140px]">
                    <Clock className="h-4 w-4" />
                    Pending
                  </Button>
                )}

                {status === "pending_received" && (
                  <Button
                    onClick={handleAcceptRequest}
                    disabled={isPending}
                    className="min-w-[140px]"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Accept Request
                  </Button>
                )}

                {status === "friends" && (
                  <Button variant="secondary" disabled className="min-w-[140px]">
                    <Check className="h-4 w-4" />
                    Friends
                  </Button>
                )}
              </div>
            </div>

            {/* Bio section */}
            {profile.bio && (
              <div className="mt-4">
                <p className="text-foreground text-center md:text-left">
                  {profile.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        <ProfileStats stats={stats} />

        <ProfileInterests
          interests={interests}
          isOwner={false}
        />

        <OtherUserGallery
          photos={photos}
          viewerIsPremium={viewerIsPremium}
        />
      </Card>

      {/* Member since footer */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Member since {new Date(profile.created_at).toLocaleDateString()}
      </p>

      {/* Upgrade dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>{upgradeMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-400 to-orange-500"
              onClick={async () => {
                const res = await fetch("/api/stripe/checkout", { method: "POST" });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
