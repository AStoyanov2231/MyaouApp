"use client";

import { useState, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileInterests } from "./ProfileInterests";
import { PhotoGallery } from "./PhotoGallery";
import { AccountSettings } from "./AccountSettings";
import { compressImage, createThumbnail } from "@/lib/image-compression";
import type {
  Profile,
  ProfilePhoto,
  ProfileInterest,
  InterestTag,
  ProfileStats as ProfileStatsType,
} from "@/types/database";

interface ProfilePageClientProps {
  profile: Profile;
  photos: ProfilePhoto[];
  interests: ProfileInterest[];
  allTags: InterestTag[];
  stats: ProfileStatsType;
}

export function ProfilePageClient({
  profile: initialProfile,
  photos: initialPhotos,
  interests: initialInterests,
  allTags,
  stats: initialStats,
}: ProfilePageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [profile, setProfile] = useState(initialProfile);
  const [photos, setPhotos] = useState(initialPhotos);
  const [interests, setInterests] = useState(initialInterests);
  const [stats, setStats] = useState(initialStats);

  // Optimistic updates for interests
  const [optimisticInterests, updateOptimisticInterests] = useOptimistic(
    interests,
    (state, action: { type: "add" | "remove"; interest?: ProfileInterest; id?: string }) => {
      if (action.type === "add" && action.interest) {
        return [...state, action.interest];
      }
      if (action.type === "remove" && action.id) {
        return state.filter((i) => i.id !== action.id);
      }
      return state;
    }
  );

  // Avatar upload handler
  const handleAvatarUpload = async (file: File) => {
    try {
      // Compress image
      const compressed = await compressImage(file);
      const thumbnail = await createThumbnail(file);

      // Upload as profile photo
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("thumbnail", thumbnail);

      const res = await fetch("/api/profile/photos", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) return;

      const data = await res.json();
      // Set as avatar
      const avatarRes = await fetch(`/api/profile/photos/${data.photo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_avatar: true }),
      });

      if (!avatarRes.ok) return;

      // Update local state
      setPhotos((prev) => [...prev.map((p) => ({ ...p, is_avatar: false })), { ...data.photo, is_avatar: true }]);
      setProfile((prev) => ({ ...prev, avatar_url: data.photo.url }));
      setStats((prev) => ({ ...prev, photos_count: prev.photos_count + 1 }));
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    }
  };

  // Photo upload handler
  const handlePhotoUpload = async (file: File) => {
    try {
      const compressed = await compressImage(file);
      const thumbnail = await createThumbnail(file);

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("thumbnail", thumbnail);

      const res = await fetch("/api/profile/photos", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) => [...prev, data.photo]);
        setStats((prev) => ({ ...prev, photos_count: prev.photos_count + 1 }));
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
    }
  };

  // Photo delete handler
  const handlePhotoDelete = async (photoId: string) => {
    try {
      const res = await fetch(`/api/profile/photos/${photoId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const deletedPhoto = photos.find((p) => p.id === photoId);
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setStats((prev) => ({ ...prev, photos_count: prev.photos_count - 1 }));

        // Clear avatar if deleted photo was avatar
        if (deletedPhoto?.is_avatar) {
          setProfile((prev) => ({ ...prev, avatar_url: null }));
        }
      }
    } catch (error) {
      console.error("Failed to delete photo:", error);
    }
  };

  // Set photo as avatar handler
  const handleSetAvatar = async (photoId: string) => {
    try {
      const res = await fetch(`/api/profile/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_avatar: true }),
      });

      if (res.ok) {
        const data = await res.json();
        setPhotos((prev) =>
          prev.map((p) => ({
            ...p,
            is_avatar: p.id === photoId,
          }))
        );
        setProfile((prev) => ({ ...prev, avatar_url: data.photo.url }));
      }
    } catch (error) {
      console.error("Failed to set avatar:", error);
    }
  };

  // Add interest handler
  const handleAddInterest = async (tagId: string) => {
    const tag = allTags.find((t) => t.id === tagId);
    if (!tag) return;

    // Optimistic update
    const tempInterest: ProfileInterest = {
      id: `temp-${Date.now()}`,
      user_id: profile.id,
      tag_id: tagId,
      created_at: new Date().toISOString(),
      tag,
    };

    startTransition(async () => {
      updateOptimisticInterests({ type: "add", interest: tempInterest });

      try {
        const res = await fetch("/api/profile/interests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag_id: tagId }),
        });

        if (res.ok) {
          const data = await res.json();
          // Replace temp with real interest
          setInterests((prev) =>
            prev.filter((i) => !i.id.startsWith("temp-")).concat(data.interest)
          );
        } else {
          // Rollback on failure - remove temp interest
          setInterests((prev) => prev.filter((i) => i.id !== tempInterest.id));
        }
      } catch (error) {
        console.error("Failed to add interest:", error);
        // Rollback on error
        setInterests((prev) => prev.filter((i) => i.id !== tempInterest.id));
      }
    });
  };

  // Remove interest handler
  const handleRemoveInterest = async (interestId: string) => {
    const removedInterest = interests.find((i) => i.id === interestId);

    startTransition(async () => {
      updateOptimisticInterests({ type: "remove", id: interestId });

      try {
        const res = await fetch(`/api/profile/interests/${interestId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setInterests((prev) => prev.filter((i) => i.id !== interestId));
        } else if (removedInterest) {
          // Rollback on failure
          setInterests((prev) => [...prev, removedInterest]);
        }
      } catch (error) {
        console.error("Failed to remove interest:", error);
        // Rollback on error
        if (removedInterest) {
          setInterests((prev) => [...prev, removedInterest]);
        }
      }
    });
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/welcome");
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  // Cancel deletion handler
  const handleCancelDeletion = async () => {
    try {
      const res = await fetch("/api/account/cancel-deletion", {
        method: "POST",
      });

      if (res.ok) {
        setProfile((prev) => ({ ...prev, scheduled_deletion_at: null }));
      }
    } catch (error) {
      console.error("Failed to cancel deletion:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      <Card className="overflow-hidden">
        <ProfileHeader
          profile={profile}
          isOwner={true}
          onAvatarUpload={handleAvatarUpload}
        />

        <ProfileStats stats={stats} />

        <ProfileInterests
          interests={isPending ? optimisticInterests : interests}
          allTags={allTags}
          isOwner={true}
          onAddInterest={handleAddInterest}
          onRemoveInterest={handleRemoveInterest}
        />

        <PhotoGallery
          photos={photos}
          isOwner={true}
          maxPhotos={12}
          onUpload={handlePhotoUpload}
          onDelete={handlePhotoDelete}
          onSetAvatar={handleSetAvatar}
        />

        <AccountSettings
          scheduledDeletionAt={profile.scheduled_deletion_at}
          onCancelDeletion={handleCancelDeletion}
          onDeleteAccount={handleDeleteAccount}
        />
      </Card>

      {/* Member since footer */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        Member since {new Date(profile.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}
