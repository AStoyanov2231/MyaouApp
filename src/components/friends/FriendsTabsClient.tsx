"use client";

import { useState, useOptimistic, useTransition, useEffect } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { PremiumBadge } from "@/components/ui/premium-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Profile, Friendship } from "@/types/database";
import { useAppStore, type FriendWithFriendshipId } from "@/stores/appStore";
import { useFriends, useFriendRequests, useIsFriendsLoaded, useOnlineUsers } from "@/stores/selectors";
import { SwipeableFriendCard } from "./SwipeableFriendCard";

function getInitials(name: string | null | undefined): string {
  if (!name || name.length === 0) return "??";
  return name.slice(0, 2).toUpperCase();
}

interface FriendsTabsClientProps {
  initialFriends: FriendWithFriendshipId[];
  initialRequests: (Friendship & { requester: Profile })[];
}

export function FriendsTabsClient({ initialFriends, initialRequests }: FriendsTabsClientProps) {
  const router = useRouter();

  // Get store data and actions
  const storeFriends = useFriends();
  const storeRequests = useFriendRequests();
  const isFriendsLoaded = useIsFriendsLoaded();
  const onlineUsers = useOnlineUsers();
  const setFriends = useAppStore((s) => s.setFriends);
  const setRequests = useAppStore((s) => s.setRequests);
  const addFriend = useAppStore((s) => s.addFriend);
  const removeFriend = useAppStore((s) => s.removeFriend);
  const removeRequest = useAppStore((s) => s.removeRequest);

  // Use store data if loaded, otherwise fall back to SSR props
  const friends = isFriendsLoaded ? storeFriends : initialFriends;
  const requests = isFriendsLoaded ? storeRequests : initialRequests;

  // Sync SSR data to store on mount if store is empty
  useEffect(() => {
    if (!isFriendsLoaded && initialFriends.length > 0) {
      setFriends(initialFriends);
    }
    if (!isFriendsLoaded && initialRequests.length > 0) {
      setRequests(initialRequests);
    }
  }, [isFriendsLoaded, initialFriends, initialRequests, setFriends, setRequests]);

  const [, startTransition] = useTransition();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // State for unfriend confirmation dialog
  const [friendToRemove, setFriendToRemove] = useState<FriendWithFriendshipId | null>(null);

  // Optimistic updates for instant feedback on accept/reject
  const [optimisticRequests, updateOptimisticRequests] = useOptimistic(
    requests,
    (state, removedId: string) => state.filter((r) => r.id !== removedId)
  );

  const [optimisticFriends, updateOptimisticFriends] = useOptimistic(
    friends,
    (state, action: { type: "add"; friend: FriendWithFriendshipId } | { type: "remove"; friendId: string }) => {
      if (action.type === "add") {
        return [...state, action.friend];
      } else {
        return state.filter((f) => f.id !== action.friendId);
      }
    }
  );

  const handleRequest = async (id: string, status: "accepted" | "blocked") => {
    // Prevent double-click
    if (processingIds.has(id)) return;

    const req = requests.find((r) => r.id === id);
    if (!req) return;

    // Mark as processing
    setProcessingIds((prev) => new Set(prev).add(id));

    // Instant UI update - remove from requests
    updateOptimisticRequests(id);

    // If accepting, instantly add to friends list (request id becomes friendship_id)
    const newFriend: FriendWithFriendshipId = { ...req.requester, friendship_id: id };
    if (status === "accepted") {
      updateOptimisticFriends({ type: "add", friend: newFriend });
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/friends/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (!res.ok) {
          throw new Error("Failed to update friendship");
        }

        // Update store on success
        removeRequest(id);
        if (status === "accepted") {
          addFriend(newFriend);
        }
      } catch (error) {
        // Optimistic state will revert since we didn't update backing state
        console.error("Failed to handle friend request:", error);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  const handleUnfriend = async (friend: FriendWithFriendshipId) => {
    const { friendship_id: friendshipId, id: friendId } = friend;

    // Prevent double-click
    if (processingIds.has(friendshipId)) return;

    // Close the dialog
    setFriendToRemove(null);

    // Mark as processing
    setProcessingIds((prev) => new Set(prev).add(friendshipId));

    // Instant UI update - remove from friends list
    updateOptimisticFriends({ type: "remove", friendId });

    startTransition(async () => {
      try {
        const res = await fetch(`/api/friends/${friendshipId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Failed to unfriend");
        }

        // Update store on success
        removeFriend(friendId);
      } catch (error) {
        console.error("Failed to unfriend:", error);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(friendshipId);
          return next;
        });
      }
    });
  };

  // Navigate to messages with this friend
  const handleOpenChat = (friendId: string) => {
    router.push(`/messages?user=${friendId}`);
  };

  return (
    <Tabs defaultValue="friends" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="friends">Friends ({optimisticFriends.length})</TabsTrigger>
        <TabsTrigger value="requests">Requests ({optimisticRequests.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="friends">
        <div className="space-y-2">
          {optimisticFriends.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No friends yet</p>
          ) : (
            optimisticFriends.map((friend) => {
              const isOnline = onlineUsers.has(friend.id);
              const isProcessing = processingIds.has(friend.friendship_id);
              return (
                <SwipeableFriendCard
                  key={friend.id}
                  onSwipeComplete={() => setFriendToRemove(friend)}
                  disabled={isProcessing}
                >
                  <Card
                    className="p-4 flex items-center gap-3 hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer select-none border-0 rounded-none"
                    onClick={() => handleOpenChat(friend.id)}
                  >
                    <div className="relative" onClick={(e) => { e.stopPropagation(); }}>
                      <Link href={`/profile/${friend.id}`}>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar_url || undefined} alt={friend.display_name || friend.username} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(friend.display_name || friend.username)}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
                        )}
                      </Link>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">{friend.display_name || friend.username}</p>
                        {friend.is_premium && <PremiumBadge size="sm" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isOnline ? <span className="text-green-500">Online</span> : `@${friend.username}`}
                      </p>
                    </div>
                    {isProcessing && (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                  </Card>
                </SwipeableFriendCard>
              );
            })
          )}
        </div>

        {/* Unfriend confirmation dialog */}
        <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
          <AlertDialogContent className="max-w-[90vw] sm:max-w-lg rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove friend?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove{" "}
                <span className="font-semibold text-foreground">
                  {friendToRemove?.display_name || friendToRemove?.username}
                </span>{" "}
                from your friends? You can always add them back later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => friendToRemove && handleUnfriend(friendToRemove)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TabsContent>

      <TabsContent value="requests">
        <div className="space-y-2">
          {optimisticRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            optimisticRequests.map((req) => (
              <Card key={req.id} className="p-4 flex items-center gap-3 hover:shadow-md hover:border-primary/20 transition-all duration-200">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={req.requester.avatar_url || undefined} alt={req.requester.display_name || req.requester.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(req.requester.display_name || req.requester.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium">{req.requester.display_name || req.requester.username}</p>
                    {req.requester.is_premium && <PremiumBadge size="sm" />}
                  </div>
                  <p className="text-sm text-muted-foreground">@{req.requester.username}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleRequest(req.id, "accepted")}
                    disabled={processingIds.has(req.id)}
                  >
                    {processingIds.has(req.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRequest(req.id, "blocked")}
                    disabled={processingIds.has(req.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
