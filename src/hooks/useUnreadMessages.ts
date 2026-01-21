"use client";
import { useCallback, useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { useTotalUnread } from "@/stores/selectors";
import { isNativeApp, postToNative } from "@/lib/native";

/**
 * Hook to get unread message count from the global store.
 * The count is preloaded on login and kept in sync via useRealtimeSync.
 * This hook now reads from Zustand store instead of maintaining local state.
 */
export function useUnreadMessages() {
  const unreadCount = useTotalUnread();
  const updateTotalUnread = useAppStore((state) => state.updateTotalUnread);
  const setThreads = useAppStore((state) => state.setThreads);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/dm/threads");
      if (!res.ok) {
        throw new Error("Failed to fetch threads");
      }
      const d = await res.json();
      setThreads(d.threads || []);
      updateTotalUnread(d.total_unread || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [setThreads, updateTotalUnread]);

  // Sync unread count to native app for tab badge
  useEffect(() => {
    if (isNativeApp()) {
      postToNative("updateBadge", { tab: "messages", count: unreadCount });
    }
  }, [unreadCount]);

  return { unreadCount, refetch };
}
