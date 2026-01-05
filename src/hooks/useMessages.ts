"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

// Get the singleton client
const supabase = createClient();

export function useMessages(placeId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages/${placeId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  const sendMessage = useCallback(
    async (content: string, mediaUrl?: string) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: placeId,
          content,
          message_type: mediaUrl ? "image" : "text",
          media_url: mediaUrl,
        }),
      });
      return res.ok;
    },
    [placeId]
  );

  useEffect(() => {
    let isMounted = true;

    fetchMessages();

    // Clean up any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Set up realtime subscription
    const channel = supabase
      .channel(`place:${placeId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `place_id=eq.${placeId}`,
        },
        async () => {
          if (!isMounted) return;
          const res = await fetch(`/api/messages/${placeId}`);
          const data = await res.json();
          if (isMounted) setMessages(data.messages || []);
          // Mark messages as read since user is viewing this place
          fetch(`/api/places/${placeId}/read`, { method: "POST" });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to place:${placeId} realtime`);
        }
      });

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [placeId, fetchMessages]);

  return { messages, loading, sendMessage, refetch: fetchMessages };
}
