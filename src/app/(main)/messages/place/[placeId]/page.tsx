"use client";
import { useEffect, useState, useRef, use, useCallback } from "react";
import { ArrowLeft, Send, Users, Loader2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import type { Place } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export default function PlaceChatPage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = use(params);
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessages(placeId);
  const [place, setPlace] = useState<Place | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    fetch(`/api/places/${placeId}`)
      .then((r) => r.json())
      .then((d) => setPlace(d.place));
    fetch(`/api/places/${placeId}/read`, { method: "POST" });
  }, [placeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    await sendMessage(input.trim());
    setInput("");
    setSending(false);
  };

  if (!place) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <div className="bg-card border-b p-4 pt-[calc(1rem+var(--safe-area-top))] md:pt-4 flex items-center gap-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="bg-card border-b p-4 pt-[calc(1rem+var(--safe-area-top))] md:pt-4 flex items-center gap-4 z-10 flex-shrink-0">
        <Link href="/messages" className="md:hidden">
          <ArrowLeft />
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold">{place.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-4 w-4" /> {place.member_count} members
          </p>
        </div>
      </header>

      <div className="relative flex-1">
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto p-4 space-y-4 scroll-container overscroll-contain"
        >
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("flex gap-3", msg.sender_id === user?.id && "flex-row-reverse")}>
                <Link href={`/profile/${msg.sender_id}`}>
                  <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80">
                    <AvatarImage src={msg.sender?.avatar_url || undefined} alt={msg.sender?.display_name || msg.sender?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(msg.sender?.display_name || msg.sender?.username || "?")}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className={cn(
                  "max-w-[75%] px-4 py-3",
                  msg.sender_id === user?.id
                    ? "message-bubble-sent animate-message-send"
                    : "message-bubble-received animate-message-receive"
                )}>
                  {msg.sender_id !== user?.id && (
                    <Link href={`/profile/${msg.sender_id}`} className="text-xs font-medium text-muted-foreground mb-1 hover:underline block">
                      {msg.sender?.display_name || msg.sender?.username}
                    </Link>
                  )}
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
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full glass shadow-soft flex items-center justify-center hover:bg-background/90 transition-all duration-200"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 pb-[calc(0.75rem+var(--safe-area-bottom))] md:pb-3 flex items-center gap-3 bg-card/80 backdrop-blur-sm border-t flex-shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="chat-input flex-1"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
        />
        <Button type="submit" disabled={!input.trim() || sending} className="chat-send-button">
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
