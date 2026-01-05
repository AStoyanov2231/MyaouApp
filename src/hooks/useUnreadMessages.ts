"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

    fetchUnreadCount();

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to dm_messages, messages, and place_members changes
    // Use debounced fetch to allow mark-as-read operations to complete first
    const channel = supabase
      .channel(`unread-count:${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, () => { if (isMounted) debouncedFetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => { if (isMounted) debouncedFetch(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "place_members" }, () => { if (isMounted) debouncedFetch(); })
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchUnreadCount, debouncedFetch]);

  return { unreadCount, refetch: fetchUnreadCount };
}
