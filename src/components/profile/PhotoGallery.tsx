"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Star,
  Trash2,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProfilePhoto } from "@/types/database";

interface PhotoGalleryProps {
  photos: ProfilePhoto[];
  isOwner: boolean;
  maxPhotos?: number;
  onUpload?: (file: File) => Promise<void>;
  onDelete?: (photoId: string) => Promise<void>;
  onSetAvatar?: (photoId: string) => Promise<void>;
  className?: string;
}

export function PhotoGallery({
  photos,
  isOwner,
  maxPhotos = 12,
  onUpload,
  onDelete,
  onSetAvatar,
  className,
}: PhotoGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingAvatarId, setSettingAvatarId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = photos.length < maxPhotos;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (photoId: string) => {
    if (!onDelete) return;
    setDeletingId(photoId);
    setMenuOpen(null);
    try {
      await onDelete(photoId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetAvatar = async (photoId: string) => {
    if (!onSetAvatar) return;
    setSettingAvatarId(photoId);
    setMenuOpen(null);
    try {
      await onSetAvatar(photoId);
    } finally {
      setSettingAvatarId(null);
    }
  };

  const openViewer = (index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (photos.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div className={cn("px-4 md:px-6 py-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Photos ({photos.length}/{maxPhotos})
        </h3>
        {isOwner && canUpload && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-primary hover:text-primary/80"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      {photos.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-muted-foreground/20",
            isOwner && "cursor-pointer hover:border-primary/40 transition-colors"
          )}
          onClick={() => isOwner && fileInputRef.current?.click()}
        >
          <ImageIcon className="h-12 w-12 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Add photos to your profile" : "No photos yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg"
              onClick={() => openViewer(index)}
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt=""
                className={cn(
                  "w-full h-full object-cover transition-transform group-hover:scale-105",
                  (deletingId === photo.id || settingAvatarId === photo.id) && "opacity-50"
                )}
              />

              {/* Avatar indicator */}
              {photo.is_avatar && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground p-1 rounded-full">
                  <Star className="h-3 w-3" />
                </div>
              )}

              {/* Loading overlay */}
              {(deletingId === photo.id || settingAvatarId === photo.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}

              {/* Hover overlay with menu */}
              {isOwner && !deletingId && !settingAvatarId && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === photo.id ? null : photo.id);
                    }}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown menu */}
                  {menuOpen === photo.id && (
                    <div
                      className="absolute top-8 right-1 bg-background rounded-lg shadow-lg border py-1 min-w-[140px] z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!photo.is_avatar && (
                        <button
                          onClick={() => handleSetAvatar(photo.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                        >
                          <Star className="h-4 w-4" />
                          Set as Avatar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent text-destructive flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="flex items-center justify-center min-h-[60vh] p-4">
            {photos[currentIndex] && (
              <img
                src={photos[currentIndex].url}
                alt=""
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {currentIndex + 1} / {photos.length}
          </div>
        </DialogContent>
      </Dialog>

      {/* Close menu when clicking outside */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setMenuOpen(null)}
        />
      )}
    </div>
  );
}
