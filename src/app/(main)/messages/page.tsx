"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useThreads, useIsMessagesLoaded } from "@/stores/selectors";
import { useAppStore, type DMThreadWithParticipants } from "@/stores/appStore";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";
import { MapPin } from "lucide-react";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function formatMessageTime(date: Date): string {
  const secondsAgo = differenceInSeconds(new Date(), date);
  if (secondsAgo < 60) return "Now";
  return formatDistanceToNow(date, { addSuffix: false });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const threads = useThreads();
  const isLoaded = useIsMessagesLoaded();
  const onlineUsers = useAppStore((state) => state.onlineUsers);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle DM thread creation from search params (e.g., /messages?user=123)
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

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Skeleton className="h-10 w-40 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-[1.5rem]" />
          ))}
        </div>
      </div>
    );
  }

  const getOtherParticipant = (thread: DMThreadWithParticipants) =>
    thread.participant_1_id === user?.id ? thread.participant_2 : thread.participant_1;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-extrabold tracking-tight mb-6">Messages</h1>

      {threads.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No conversations yet</p>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => {
            const isPlace = thread.type === "place";
            const href = isPlace ? `/messages/place/${thread.id}` : `/messages/${thread.id}`;
            const otherUser = !isPlace ? getOtherParticipant(thread) : null;
            const name = isPlace ? thread.name : (otherUser?.display_name || otherUser?.username || "");
            const avatarSrc = isPlace ? thread.cached_photo_url : otherUser?.avatar_url;
            const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
            const isPremium = otherUser?.is_premium || false;

            return (
              <Link
                key={thread.id}
                href={href}
                className={cn(
                  "glass py-3 px-4 rounded-[1.5rem] shadow-soft flex items-center gap-4 relative overflow-hidden block",
                  thread.unread_count && "ring-1 ring-accent/30"
                )}
              >
                {/* Unread accent bar */}
                {thread.unread_count ? (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent rounded-l-[1.5rem]" />
                ) : null}

                <div className="relative flex-shrink-0">
                  {isPlace ? (
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="text-primary h-5 w-5" />
                    </div>
                  ) : (
                    <div className="cat-avatar">
                      <Avatar className="h-12 w-12 border-2 border-white dark:border-border shadow-sm">
                        <AvatarImage src={avatarSrc || undefined} alt={name} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  {/* Online status indicator */}
                  {!isPlace && isOnline && (
                    <div className="absolute bottom-0 right-0 status-online presence-pulse" />
                  )}
                  {thread.unread_count ? (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-accent rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[9px] font-bold text-accent-foreground">
                        {thread.unread_count > 9 ? "9+" : thread.unread_count}
                      </span>
                    </div>
                  ) : null}
                </div>
                {/* Column 2: Name + Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className={cn(
                      "text-lg truncate",
                      thread.unread_count ? "font-bold" : "font-semibold"
                    )}>{name}</p>
                    {isPremium && <PremiumBadge size="sm" />}
                  </div>
                  {thread.last_message_preview && (
                    <p className={cn(
                      "text-sm truncate",
                      thread.unread_count ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>{thread.last_message_preview}</p>
                  )}
                </div>

                {/* Column 3: Timestamp */}
                {thread.last_message_at && (
                  <div className="flex-shrink-0 self-start pt-0.5">
                    <span className={cn(
                      "text-xs font-semibold",
                      thread.unread_count ? "text-accent" : "text-muted-foreground"
                    )}>
                      {formatMessageTime(new Date(thread.last_message_at))}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
