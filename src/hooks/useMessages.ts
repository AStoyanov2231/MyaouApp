"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export function useMessages(placeId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Create stable supabase client
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const initializedRef = useRef(false);

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
    // Prevent double initialization in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    fetchMessages();

    // Set up realtime subscription
    channelRef.current = supabase
      .channel(`place:${placeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `place_id=eq.${placeId}`,
        },
        async (payload) => {
          if (!isMounted) return;

          const { data: newMessage } = await supabase
            .from("messages")
            .select("*, sender:profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (newMessage && isMounted) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channelRef.current?.unsubscribe();
    };
  }, [placeId, fetchMessages, supabase]);

  return { messages, loading, sendMessage, refetch: fetchMessages };
}
