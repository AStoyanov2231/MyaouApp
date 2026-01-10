"use client";
import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/stores/appStore";
import { useIsPreloading } from "@/stores/selectors";
import type { DMMessage, Message, Profile } from "@/types/database";

const supabase = createClient();

// Throttle visibility change refetches to once per 30 seconds
const VISIBILITY_THROTTLE_MS = 30000;

export function useRealtimeSync() {
  const isPreloading = useIsPreloading();
  const addMessage = useAppStore((state) => state.addMessage);
  const setFriends = useAppStore((state) => state.setFriends);
  const setRequests = useAppStore((state) => state.setRequests);
  const updateTotalUnread = useAppStore((state) => state.updateTotalUnread);
  const setThreads = useAppStore((state) => state.setThreads);
  const updateStats = useAppStore((state) => state.updateStats);

  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const lastVisibilityFetchRef = useRef<number>(0);
  const isSetupRef = useRef<boolean>(false);

  // Refetch threads and unread count
  const refetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/dm/threads");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
        updateTotalUnread(data.total_unread || 0);
      }
    } catch (error) {
      console.error("Failed to refetch threads:", error);
    }
  }, [setThreads, updateTotalUnread]);

  // Refetch friends data
  const refetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/friends");
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
        updateStats({ friends_count: data.friends?.length || 0 });
      }

      const reqRes = await fetch("/api/friends/requests");
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }
    } catch (error) {
      console.error("Failed to refetch friends:", error);
    }
  }, [setFriends, setRequests, updateStats]);

  useEffect(() => {
    // Don't set up channels until preload completes
    if (isPreloading) {
      return;
    }

    // Prevent duplicate setup
    if (isSetupRef.current) {
      return;
    }
    isSetupRef.current = true;

    let isMounted = true;

    // Clean up any existing channels
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Channel for DM messages - update store on new messages
    const dmMessagesChannel = supabase
      .channel("global-dm-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
        },
        (payload) => {
          if (!isMounted) return;
          const msg = payload.new as DMMessage;
          addMessage(msg.thread_id, msg);
          // Refetch to update unread counts and thread order
          refetchThreads();
        }
      )
      .subscribe();

    // Channel for place messages - update store on new messages
    const placeMessagesChannel = supabase
      .channel("global-place-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (!isMounted) return;
          const msg = payload.new as Message;
          addMessage(msg.place_id, msg);
          // Refetch to update unread counts
          refetchThreads();
        }
      )
      .subscribe();

    // Channel for friendships - refetch friends on any change
    const friendshipsChannel = supabase
      .channel("global-friendships")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        () => {
          if (!isMounted) return;
          refetchFriends();
        }
      )
      .subscribe();

    // Channel for profile updates - useful if profile is updated elsewhere
    const profilesChannel = supabase
      .channel("global-profiles")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (!isMounted) return;
          const updatedProfile = payload.new as Profile;
          const currentProfile = useAppStore.getState().profile;
          if (currentProfile && currentProfile.id === updatedProfile.id) {
            useAppStore.getState().setProfile(updatedProfile);
          }
        }
      )
      .subscribe();

    channelsRef.current = [
      dmMessagesChannel,
      placeMessagesChannel,
      friendshipsChannel,
      profilesChannel,
    ];

    // Handle visibility changes (mobile background/foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMounted) {
        const now = Date.now();
        if (now - lastVisibilityFetchRef.current > VISIBILITY_THROTTLE_MS) {
          lastVisibilityFetchRef.current = now;
          // Soft refresh - update threads and unread counts
          refetchThreads();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      isSetupRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [isPreloading, addMessage, refetchThreads, refetchFriends]);
}
