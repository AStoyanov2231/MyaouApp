"use client";
import { useAppStore } from "./appStore";

// Profile selectors
export const useProfile = () => useAppStore((state) => state.profile);
export const usePhotos = () => useAppStore((state) => state.photos);
export const useInterests = () => useAppStore((state) => state.interests);
export const useAllTags = () => useAppStore((state) => state.allTags);
export const useProfileStats = () => useAppStore((state) => state.stats);
export const useIsProfileLoaded = () => useAppStore((state) => state.isProfileLoaded);

// Friends selectors
export const useFriends = () => useAppStore((state) => state.friends);
export const useFriendRequests = () => useAppStore((state) => state.requests);
export const useIsFriendsLoaded = () => useAppStore((state) => state.isFriendsLoaded);

// Messages selectors
export const useThreads = () => useAppStore((state) => state.threads);
export const useTotalUnread = () => useAppStore((state) => state.totalUnread);
export const useCurrentPlace = () => useAppStore((state) => state.currentPlace);
export const useIsMessagesLoaded = () => useAppStore((state) => state.isMessagesLoaded);

// Thread messages selector (for specific thread)
export const useThreadMessages = (threadId: string) =>
  useAppStore((state) => state.threadMessages[threadId] ?? []);

// Loading selectors
export const useIsPreloading = () => useAppStore((state) => state.isPreloading);
export const usePreloadError = () => useAppStore((state) => state.preloadError);

// Check if all data is loaded
export const useIsFullyLoaded = () =>
  useAppStore(
    (state) =>
      state.isProfileLoaded && state.isFriendsLoaded && state.isMessagesLoaded
  );
