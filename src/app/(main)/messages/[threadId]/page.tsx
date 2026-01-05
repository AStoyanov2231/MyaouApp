"use client";
import { useEffect, useState, useRef, use } from "react";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { Button, Input, Avatar, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { DMThread, DMMessage, Profile } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

const supabase = createClient();

type ThreadWithParticipants = DMThread & {
  participant_1: Profile;
  participant_2: Profile;
};

export default function DMConversationPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadWithParticipants | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/dm/${threadId}`)
      .then((r) => r.json())
      .then((d) => {
        if (isMounted) {
          setThread(d.thread);
          setMessages(d.messages || []);
          setLoading(false);
        }
      });

    // Mark messages as read when viewing thread
    fetch(`/api/dm/${threadId}/read`, { method: "POST" });

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`dm:${threadId}:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          if (!isMounted) return;
          const { data: newMessage } = await supabase
            .from("dm_messages")
            .select("*, sender:profiles(*)")
            .eq("id", payload.new.id)
            .single();
          if (newMessage && isMounted) {
            setMessages((prev) => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            // Mark as read since user is viewing
            fetch(`/api/dm/${threadId}/read`, { method: "POST" });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Subscribed to dm:${threadId} realtime`);
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
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch(`/api/dm/${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim() }),
    });
    setInput("");
    setSending(false);
  };

  if (loading || !thread) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  const other = thread.participant_1_id === user?.id ? thread.participant_2 : thread.participant_1;

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b p-4 flex items-center gap-4">
        <Link href="/messages" className="md:hidden">
          <ArrowLeft />
        </Link>
        <Avatar src={other.avatar_url} name={other.display_name || other.username} size="sm" />
        <div>
          <h1 className="font-semibold">{other.display_name || other.username}</h1>
          <p className="text-sm text-gray-500">@{other.username}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender_id === user?.id ? "flex-row-reverse" : ""}`}
          >
            <Avatar src={msg.sender?.avatar_url} name={msg.sender?.display_name || msg.sender?.username} size="sm" />
            <div
              className={`max-w-[70%] ${
                msg.sender_id === user?.id
                  ? "bg-primary text-white rounded-l-xl rounded-tr-xl"
                  : "bg-white rounded-r-xl rounded-tl-xl"
              } p-3 shadow-sm`}
            >
              {msg.media_url && <img src={msg.media_url} alt="" className="rounded mb-2 max-w-full" />}
              <p>{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? "text-white/70" : "text-gray-400"}`}>
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="bg-white border-t p-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" disabled={!input.trim() || sending}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
