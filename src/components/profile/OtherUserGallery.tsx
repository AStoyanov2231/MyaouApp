"use client";

import { useState } from "react";
import { Lock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BlurredPhoto } from "./BlurredPhoto";
import { cn } from "@/lib/utils";
import type { ProfilePhoto } from "@/types/database";

interface OtherUserGalleryProps {
  photos: ProfilePhoto[];
  viewerIsPremium: boolean;
  className?: string;
}

export function OtherUserGallery({
  photos,
  viewerIsPremium,
  className,
}: OtherUserGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const publicPhotos = photos.filter((p) => !p.is_private);
  const privatePhotos = photos.filter((p) => p.is_private);

  // If viewer is premium, they see all photos
  const visiblePhotos = viewerIsPremium ? photos : publicPhotos;

  const openViewer = (index: number) => {
    if (!viewerIsPremium && photos[index]?.is_private) {
      return; // Don't open viewer for private photos if not premium
    }
    // Find the index in visiblePhotos array
    const photo = photos[index];
    const visibleIndex = visiblePhotos.findIndex((p) => p.id === photo.id);
    if (visibleIndex >= 0) {
      setCurrentIndex(visibleIndex);
      setViewerOpen(true);
    }
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % visiblePhotos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + visiblePhotos.length) % visiblePhotos.length
    );
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className={cn("px-4 md:px-6 py-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Photos ({photos.length})
          {!viewerIsPremium && privatePhotos.length > 0 && (
            <span className="ml-2 text-xs">
              <Lock className="inline h-3 w-3 mr-1" />
              {privatePhotos.length} private
            </span>
          )}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-1 md:gap-2">
        {photos.map((photo, index) => {
          const isPrivate = photo.is_private;
          const canView = viewerIsPremium || !isPrivate;

          if (!canView) {
            return (
              <BlurredPhoto
                key={photo.id}
                src={photo.thumbnail_url || photo.url}
                className="aspect-square rounded-lg"
              />
            );
          }

          return (
            <div
              key={photo.id}
              className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg"
              onClick={() => openViewer(index)}
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {isPrivate && viewerIsPremium && (
                <div className="absolute top-1 right-1 p-1 rounded-full bg-black/50">
                  <Lock className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {visiblePhotos.length > 1 && (
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
            {visiblePhotos[currentIndex] && (
              <img
                src={visiblePhotos[currentIndex].url}
                alt=""
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {currentIndex + 1} / {visiblePhotos.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
