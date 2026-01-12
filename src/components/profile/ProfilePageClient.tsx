"use client";

import { useState, useOptimistic, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileInterests } from "./ProfileInterests";
import { PhotoGallery } from "./PhotoGallery";
import { PremiumSection } from "./PremiumSection";
import { AccountSettings } from "./AccountSettings";
import { compressImage, createThumbnail } from "@/lib/image-compression";
import { useAppStore } from "@/stores/appStore";
import {
  useProfile as useStoreProfile,
  usePhotos as useStorePhotos,
  useInterests as useStoreInterests,
  useAllTags as useStoreAllTags,
  useProfileStats as useStoreStats,
  useIsProfileLoaded,
} from "@/stores/selectors";
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
  allTags: initialAllTags,
  stats: initialStats,
}: ProfilePageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Get store data and actions
  const storeProfile = useStoreProfile();
  const storePhotos = useStorePhotos();
  const storeInterests = useStoreInterests();
  const storeAllTags = useStoreAllTags();
  const storeStats = useStoreStats();
  const isProfileLoaded = useIsProfileLoaded();

  const setStoreProfile = useAppStore((s) => s.setProfile);
  const setStorePhotos = useAppStore((s) => s.setPhotos);
  const setStoreInterests = useAppStore((s) => s.setInterests);
  const setStoreAllTags = useAppStore((s) => s.setAllTags);
  const setStoreStats = useAppStore((s) => s.setStats);
  const updateStoreStats = useAppStore((s) => s.updateStats);

  // Use store data if loaded, otherwise fall back to SSR props
  const profile = isProfileLoaded && storeProfile ? storeProfile : initialProfile;
  const photos = isProfileLoaded ? storePhotos : initialPhotos;
  const interests = isProfileLoaded ? storeInterests : initialInterests;
  const allTags = isProfileLoaded && storeAllTags.length > 0 ? storeAllTags : initialAllTags;
  const stats = isProfileLoaded ? storeStats : initialStats;

  // Sync SSR data to store on mount if store is empty
  useEffect(() => {
    if (!isProfileLoaded) {
      if (initialProfile) setStoreProfile(initialProfile);
      if (initialPhotos.length > 0) setStorePhotos(initialPhotos);
      if (initialInterests.length > 0) setStoreInterests(initialInterests);
      if (initialAllTags.length > 0) setStoreAllTags(initialAllTags);
      setStoreStats(initialStats);
    }
  }, [
    isProfileLoaded,
    initialProfile,
    initialPhotos,
    initialInterests,
    initialAllTags,
    initialStats,
    setStoreProfile,
    setStorePhotos,
    setStoreInterests,
    setStoreAllTags,
    setStoreStats,
  ]);

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

      // Update store
      const newPhotos = [...photos.map((p) => ({ ...p, is_avatar: false })), { ...data.photo, is_avatar: true }];
      setStorePhotos(newPhotos);
      setStoreProfile({ ...profile, avatar_url: data.photo.url });
      updateStoreStats({ photos_count: stats.photos_count + 1 });
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
        setStorePhotos([...photos, data.photo]);
        updateStoreStats({ photos_count: stats.photos_count + 1 });
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
        setStorePhotos(photos.filter((p) => p.id !== photoId));
        updateStoreStats({ photos_count: Math.max(0, stats.photos_count - 1) });

        // Clear avatar if deleted photo was avatar
        if (deletedPhoto?.is_avatar) {
          setStoreProfile({ ...profile, avatar_url: null });
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
        setStorePhotos(
          photos.map((p) => ({
            ...p,
            is_avatar: p.id === photoId,
          }))
        );
        setStoreProfile({ ...profile, avatar_url: data.photo.url });
      }
    } catch (error) {
      console.error("Failed to set avatar:", error);
    }
  };

  // Toggle photo privacy handler
  const handleTogglePrivate = async (photoId: string, isPrivate: boolean) => {
    try {
      const res = await fetch(`/api/profile/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_private: isPrivate }),
      });

      if (res.ok) {
        setStorePhotos(
          photos.map((p) =>
            p.id === photoId ? { ...p, is_private: isPrivate } : p
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle photo privacy:", error);
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
          // Replace temp with real interest in store
          const newInterests = interests
            .filter((i) => !i.id.startsWith("temp-"))
            .concat(data.interest);
          setStoreInterests(newInterests);
        } else {
          // Rollback on failure - remove temp interest from store
          setStoreInterests(interests.filter((i) => i.id !== tempInterest.id));
        }
      } catch (error) {
        console.error("Failed to add interest:", error);
        // Rollback on error
        setStoreInterests(interests.filter((i) => i.id !== tempInterest.id));
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
          setStoreInterests(interests.filter((i) => i.id !== interestId));
        } else if (removedInterest) {
          // Rollback on failure
          setStoreInterests([...interests, removedInterest]);
        }
      } catch (error) {
        console.error("Failed to remove interest:", error);
        // Rollback on error
        if (removedInterest) {
          setStoreInterests([...interests, removedInterest]);
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
        // Clear the store on account deletion
        useAppStore.getState().clearStore();
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
        setStoreProfile({ ...profile, scheduled_deletion_at: null });
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
          onTogglePrivate={handleTogglePrivate}
        />

        <PremiumSection
          isPremium={profile.is_premium}
          premiumUntil={profile.premium_until}
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
