"use client";
import { useEffect, useState, useRef, use } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/stores/appStore";
import { useThreadMessages } from "@/stores/selectors";
import type { DMThread, DMMessage, Profile } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

type ThreadWithParticipants = DMThread & {
  participant_1: Profile;
  participant_2: Profile;
};

export default function DMConversationPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const { user } = useAuth();
  const [thread, setThread] = useState<ThreadWithParticipants | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Read messages from store (updated by global useRealtimeSync)
  const storeMessages = useThreadMessages(threadId);
  const setThreadMessages = useAppStore((s) => s.setThreadMessages);
  const markThreadRead = useAppStore((s) => s.markThreadRead);

  // Use store messages if available, otherwise local fetch
  const [localMessages, setLocalMessages] = useState<DMMessage[]>([]);
  const messages = storeMessages.length > 0 ? (storeMessages as DMMessage[]) : localMessages;

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/dm/${threadId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load thread");
        return r.json();
      })
      .then((d) => {
        if (isMounted) {
          setThread(d.thread);
          const msgs = d.messages || [];
          setLocalMessages(msgs);
          // Also update store so global sync can add to it
          setThreadMessages(threadId, msgs);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load thread:", err);
        if (isMounted) setLoading(false);
      });

    // Mark messages as read when viewing thread
    fetch(`/api/dm/${threadId}/read`, { method: "POST" });
    markThreadRead(threadId);

    // No per-route Realtime subscription needed - useRealtimeSync handles it globally

    return () => {
      isMounted = false;
    };
  }, [threadId, setThreadMessages, markThreadRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/dm/${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim() }),
    });
    if (!res.ok) {
      console.error("Failed to send message");
      setSending(false);
      return;
    }
    const { message } = await res.json();
    if (message) setLocalMessages((prev) => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
    setInput("");
    setSending(false);
  };

  if (loading || !thread) {
    return (
      <div className="flex flex-col h-screen">
        <div className="bg-card border-b p-4 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const other = thread.participant_1_id === user?.id ? thread.participant_2 : thread.participant_1;

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-card border-b p-4 flex items-center gap-4">
        <Link href="/messages" className="md:hidden">
          <ArrowLeft />
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarImage src={other.avatar_url || undefined} alt={other.display_name || other.username} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getInitials(other.display_name || other.username)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-semibold">{other.display_name || other.username}</h1>
          <p className="text-sm text-muted-foreground">@{other.username}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-3", msg.sender_id === user?.id && "flex-row-reverse")}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={msg.sender?.avatar_url || undefined} alt={msg.sender?.display_name || msg.sender?.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getInitials(msg.sender?.display_name || msg.sender?.username || "?")}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "max-w-[70%] p-3 shadow-sm",
                msg.sender_id === user?.id
                  ? "bg-primary text-primary-foreground rounded-l-xl rounded-tr-xl"
                  : "bg-card rounded-r-xl rounded-tl-xl"
              )}
            >
              {msg.media_url && <img src={msg.media_url} alt="" className="rounded mb-2 max-w-full" />}
              <p>{msg.content}</p>
              <p className={cn(
                "text-xs mt-1",
                msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="bg-card border-t p-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-10"
        />
        <Button type="submit" disabled={!input.trim() || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
