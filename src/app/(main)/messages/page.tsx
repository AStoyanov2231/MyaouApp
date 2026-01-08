"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { DMThread, Profile } from "@/types/database";
import { formatDistanceToNow } from "date-fns";
import { MapPin } from "lucide-react";

const supabase = createClient();

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

type DMThreadWithParticipants = DMThread & {
  type: "dm";
  participant_1: Profile;
  participant_2: Profile;
  unread_count?: number;
};

type PlaceThread = {
  id: string;
  type: "place";
  name: string;
  cached_photo_url?: string;
  member_count?: number;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count?: number;
};

type Thread = DMThreadWithParticipants | PlaceThread;

export default function MessagesPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchThreads = useCallback(async () => {
    const res = await fetch("/api/dm/threads");
    const d = await res.json();
    setThreads(d.threads || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchThreads();

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to dm_threads changes for this user
    const channel = supabase
      .channel(`dm-threads:${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_threads",
        },
        async () => {
          // Refetch threads when any thread changes
          if (isMounted) {
            fetchThreads();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
        },
        async () => {
          if (isMounted) fetchThreads();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async () => {
          if (isMounted) fetchThreads();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to dm threads realtime");
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
  }, [fetchThreads]);

  useEffect(() => {
    const userId = searchParams.get("user");
    if (userId && user) {
      fetch("/api/dm/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.thread_id) router.push(`/messages/${d.thread_id}`);
        });
    }
  }, [searchParams, user, router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const getOtherParticipant = (thread: DMThreadWithParticipants) =>
    thread.participant_1_id === user?.id ? thread.participant_2 : thread.participant_1;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>

      {threads.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No conversations yet</p>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const isPlace = thread.type === "place";
            const href = isPlace ? `/messages/place/${thread.id}` : `/messages/${thread.id}`;
            const name = isPlace ? thread.name : (() => { const o = getOtherParticipant(thread); return o.display_name || o.username; })();
            const avatarSrc = isPlace ? thread.cached_photo_url : getOtherParticipant(thread).avatar_url;

            return (
              <Link
                key={thread.id}
                href={href}
                className={cn(
                  "bg-card rounded-lg p-4 flex items-center gap-3 hover:bg-accent/50 block",
                  thread.unread_count && "border-l-4 border-primary"
                )}
              >
                <div className="relative">
                  {isPlace ? (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="text-primary" size={20} />
                    </div>
                  ) : (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarSrc || undefined} alt={name} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {thread.unread_count ? (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                      {thread.unread_count > 9 ? "9+" : thread.unread_count}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium", thread.unread_count && "font-bold")}>{name}</p>
                  {thread.last_message_preview && (
                    <p className={cn(
                      "text-sm truncate",
                      thread.unread_count ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>{thread.last_message_preview}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {thread.last_message_at && (
                    <span className={cn(
                      "text-xs",
                      thread.unread_count ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
