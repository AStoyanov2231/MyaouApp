"use client";
import { useEffect, useState, useRef, use } from "react";
import { ArrowLeft, Send, Loader2, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsUserOnline } from "@/hooks/usePresence";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";
import { useAppStore } from "@/stores/appStore";
import { useThreadMessages } from "@/stores/selectors";
import type { DMThread, DMMessage, Profile } from "@/types/database";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

const EDIT_WINDOW_MINUTES = 15;

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Read messages from store (updated by global useRealtimeSync)
  const storeMessages = useThreadMessages(threadId);
  const setThreadMessages = useAppStore((s) => s.setThreadMessages);
  const markThreadRead = useAppStore((s) => s.markThreadRead);
  const setActiveThreadId = useAppStore((s) => s.setActiveThreadId);

  // Use store messages if available, otherwise local fetch
  const [localMessages, setLocalMessages] = useState<DMMessage[]>([]);
  const messages = storeMessages.length > 0 ? (storeMessages as DMMessage[]) : localMessages;

  // Compute other participant's ID for presence check (hook must be called unconditionally)
  const otherParticipantId = thread
    ? (thread.participant_1_id === user?.id ? thread.participant_2_id : thread.participant_1_id)
    : undefined;
  const isOtherOnline = useIsUserOnline(otherParticipantId);
  const isKeyboardVisible = useKeyboardVisible();

  useEffect(() => {
    let isMounted = true;

    // Track that user is viewing this thread (for realtime unread logic)
    setActiveThreadId(threadId);

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
      // Clear active thread when leaving (only if still viewing this thread)
      const currentActiveThreadId = useAppStore.getState().activeThreadId;
      if (currentActiveThreadId === threadId) {
        useAppStore.getState().setActiveThreadId(null);
      }
    };
  }, [threadId, setThreadMessages, markThreadRead, setActiveThreadId]);

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

  const canEditMessage = (msg: DMMessage) => {
    if (msg.sender_id !== user?.id || msg.is_deleted) return false;
    const minutesSince = differenceInMinutes(new Date(), new Date(msg.created_at));
    return minutesSince <= EDIT_WINDOW_MINUTES;
  };

  const handleStartEdit = (msg: DMMessage) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content || "");
    setMenuOpenId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(`/api/dm/${threadId}/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Failed to edit message:", data.error);
      }
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleDelete = async (messageId: string) => {
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/dm/${threadId}/${messageId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Failed to delete message:", data.error);
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  if (loading || !thread) {
    return (
      <div className="fixed inset-0 flex flex-col bg-background">
        <div className="bg-card border-b p-4 pt-[calc(1rem+var(--safe-area-top))] md:pt-4 flex items-center gap-4">
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
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="bg-card border-b p-4 pt-[calc(1rem+var(--safe-area-top))] md:pt-4 flex items-center gap-4 z-10 flex-shrink-0">
        <Link href="/messages" className="md:hidden">
          <ArrowLeft />
        </Link>
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={other.avatar_url || undefined} alt={other.display_name || other.username} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(other.display_name || other.username)}
            </AvatarFallback>
          </Avatar>
          {isOtherOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-semibold">{other.display_name || other.username}</h1>
            {other.is_premium && <PremiumBadge size="sm" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {isOtherOnline ? (
              <span className="text-green-500">Online</span>
            ) : (
              `@${other.username}`
            )}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-container overscroll-contain">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === user?.id;
          const isEditing = editingMessageId === msg.id;
          const showMenu = menuOpenId === msg.id;

          return (
            <div
              key={msg.id}
              className={cn("flex gap-3 group", isOwn && "flex-row-reverse")}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.sender?.avatar_url || undefined} alt={msg.sender?.display_name || msg.sender?.username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(msg.sender?.display_name || msg.sender?.username || "?")}
                </AvatarFallback>
              </Avatar>

              <div className={cn("flex items-start gap-1", isOwn && "flex-row-reverse")}>
                <div
                  className={cn(
                    "max-w-[75%] px-4 py-3",
                    isOwn
                      ? "message-bubble-sent animate-message-send"
                      : "message-bubble-received animate-message-receive"
                  )}
                >
                  {msg.is_deleted ? (
                    <p className="italic opacity-60">This message was deleted</p>
                  ) : isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="h-8 text-sm bg-background text-foreground"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(msg.id);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSaveEdit(msg.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      {msg.media_url && <img src={msg.media_url} alt="" className="rounded mb-2 max-w-full" />}
                      <p>{msg.content}</p>
                    </>
                  )}
                  <p className={cn(
                    "text-xs mt-1",
                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    {msg.is_edited && !msg.is_deleted && (
                      <span className="ml-1">(edited)</span>
                    )}
                  </p>
                </div>

                {/* Action menu for own messages */}
                {isOwn && !msg.is_deleted && !isEditing && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        showMenu && "opacity-100"
                      )}
                      onClick={() => setMenuOpenId(showMenu ? null : msg.id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {showMenu && (
                      <div className="absolute top-8 right-0 z-10 bg-card border rounded-lg shadow-lg py-1 min-w-[120px]">
                        {canEditMessage(msg) && (
                          <button
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                            onClick={() => handleStartEdit(msg)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                          onClick={() => handleDelete(msg.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
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
