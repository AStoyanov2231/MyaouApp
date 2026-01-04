"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/database";

export function useMessages(placeId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/messages/${placeId}`);
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
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
    fetchMessages();

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
          const { data: newMessage } = await supabase
            .from("messages")
            .select("*, sender:profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [placeId, fetchMessages, supabase]);

  return { messages, loading, sendMessage, refetch: fetchMessages };
}
