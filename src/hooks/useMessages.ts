"use client";
import { useState, useEffect, useCallback } from "react";
import type { Message } from "@/types/database";
import { useAppStore } from "@/stores/appStore";
import { useThreadMessages } from "@/stores/selectors";

/**
 * Hook for place chat messages.
 * Reads from store (updated by global useRealtimeSync) and provides send functionality.
 * No per-route Realtime subscription - global handler manages it.
 */
export function useMessages(placeId: string) {
  const [loading, setLoading] = useState(true);

  // Read messages from store (updated by global useRealtimeSync)
  const storeMessages = useThreadMessages(placeId);

  // Local messages as fallback if store is empty
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messages = storeMessages.length > 0 ? (storeMessages as Message[]) : localMessages;

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
    // Get store actions via getState() to avoid dependency issues
    // This prevents infinite re-render loops (React error #185)
    const { setThreadMessages, markThreadRead } = useAppStore.getState();

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/messages/${placeId}`);
        const data = await res.json();
        const msgs = data.messages || [];
        setLocalMessages(msgs);
        // Update store so global sync can add new messages to it
        setThreadMessages(placeId, msgs);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    // Mark as read when viewing
    fetch(`/api/places/${placeId}/read`, { method: "POST" });
    markThreadRead(placeId);

    // No per-route Realtime subscription - useRealtimeSync handles it globally
  }, [placeId]); // Only depend on placeId - stable primitive

  return { messages, loading, sendMessage };
}
