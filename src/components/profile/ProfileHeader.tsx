"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface ProfileHeaderProps {
  profile: Profile;
  isOwner: boolean;
  onAvatarUpload?: (file: File) => Promise<void>;
}

function getInitials(name: string) {
  if (!name || name.length === 0) return "?";
  return name.slice(0, 2).toUpperCase();
}

export function ProfileHeader({
  profile,
  isOwner,
  onAvatarUpload,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (isOwner && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarUpload) {
      await onAvatarUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      {/* Gradient background header */}
      <div className="h-24 md:h-32 gradient-brand rounded-t-2xl" />

      <div className="px-4 md:px-6 pb-6">
        {/* Avatar section */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16">
          <div className="relative mx-auto md:mx-0">
            <Avatar
              className={cn(
                "h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl",
                isOwner && "cursor-pointer group"
              )}
              onClick={handleAvatarClick}
            >
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.display_name || profile.username}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl md:text-3xl font-semibold">
                {getInitials(profile.display_name || profile.username)}
              </AvatarFallback>
            </Avatar>

            {isOwner && (
              <>
                <button
                  onClick={handleAvatarClick}
                  className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Name and info section */}
          <div className="flex-1 text-center md:text-left md:pb-2">
            <h1 className="text-2xl md:text-3xl font-bold font-['Outfit'] gradient-brand-text">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        {/* Bio section */}
        <div className="mt-4">
          {profile.bio ? (
            <p className="text-foreground text-center md:text-left">{profile.bio}</p>
          ) : isOwner ? (
            <p className="text-muted-foreground text-center md:text-left italic">
              No bio yet
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
