"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Throttle visibility change refetches to once per 30 seconds
const VISIBILITY_THROTTLE_MS = 30000;

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityFetchRef = useRef<number>(0);
  const isReconnectingRef = useRef<boolean>(false);
  const isSubscribedRef = useRef<boolean>(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/dm/threads");
      const d = await res.json();
      setUnreadCount(d.total_unread || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  // Debounced fetch to handle race conditions with mark-as-read operations
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchUnreadCount();
    }, 300);
  }, [fetchUnreadCount]);

  useEffect(() => {
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const setupChannel = () => {
      // Prevent duplicate setup if already reconnecting or subscribed
      if (isReconnectingRef.current || isSubscribedRef.current) {
        return;
      }

      // Clean up existing channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      isReconnectingRef.current = true;

      // Subscribe to dm_messages, messages, and place_members changes
      // Use debounced fetch to allow mark-as-read operations to complete first
      const channel = supabase
        .channel("unread-count")
        .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, () => {
          if (isMounted) debouncedFetch();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          if (isMounted) debouncedFetch();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "place_members" }, () => {
          if (isMounted) debouncedFetch();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("Subscribed to unread-count realtime");
            isReconnectingRef.current = false;
            isSubscribedRef.current = true;
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            console.warn(`Unread channel ${status}, attempting reconnect in 3s...`);
            isReconnectingRef.current = false;
            isSubscribedRef.current = false;
            if (isMounted) {
              reconnectTimeout = setTimeout(setupChannel, 3000);
            }
          }
        });

      channelRef.current = channel;
    };

    // Handle visibility changes (mobile background/foreground)
    // Throttled to prevent excessive API calls when rapidly switching tabs
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMounted) {
        const now = Date.now();
        if (now - lastVisibilityFetchRef.current > VISIBILITY_THROTTLE_MS) {
          lastVisibilityFetchRef.current = now;
          fetchUnreadCount(); // Refresh count on return
        }
        // Only reconnect if not already subscribed or reconnecting
        if (!isSubscribedRef.current && !isReconnectingRef.current) {
          setupChannel();
        }
      }
    };

    fetchUnreadCount();
    setupChannel();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isReconnectingRef.current = false;
      isSubscribedRef.current = false;
    };
  }, [fetchUnreadCount, debouncedFetch]);

  return { unreadCount, refetch: fetchUnreadCount };
}
