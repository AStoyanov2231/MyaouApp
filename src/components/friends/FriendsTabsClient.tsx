"use client";

import { useState, useOptimistic, useTransition, useEffect } from "react";
import { Check, X, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { Profile, Friendship } from "@/types/database";
import { useAppStore } from "@/stores/appStore";
import { useFriends, useFriendRequests, useIsFriendsLoaded } from "@/stores/selectors";

function getInitials(name: string | null | undefined): string {
  if (!name || name.length === 0) return "??";
  return name.slice(0, 2).toUpperCase();
}

interface FriendsTabsClientProps {
  initialFriends: Profile[];
  initialRequests: (Friendship & { requester: Profile })[];
}

export function FriendsTabsClient({ initialFriends, initialRequests }: FriendsTabsClientProps) {
  // Get store data and actions
  const storeFriends = useFriends();
  const storeRequests = useFriendRequests();
  const isFriendsLoaded = useIsFriendsLoaded();
  const setFriends = useAppStore((s) => s.setFriends);
  const setRequests = useAppStore((s) => s.setRequests);
  const addFriend = useAppStore((s) => s.addFriend);
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

  // Optimistic updates for instant feedback on accept/reject
  const [optimisticRequests, updateOptimisticRequests] = useOptimistic(
    requests,
    (state, removedId: string) => state.filter((r) => r.id !== removedId)
  );

  const [optimisticFriends, addOptimisticFriend] = useOptimistic(
    friends,
    (state, newFriend: Profile) => [...state, newFriend]
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

    // If accepting, instantly add to friends list
    if (status === "accepted") {
      addOptimisticFriend(req.requester);
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
          addFriend(req.requester);
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
            optimisticFriends.map((friend) => (
              <Card key={friend.id} className="p-4 flex items-center gap-3">
                <Link href={`/profile/${friend.id}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar_url || undefined} alt={friend.display_name || friend.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(friend.display_name || friend.username)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1">
                  <p className="font-medium">{friend.display_name || friend.username}</p>
                  <p className="text-sm text-muted-foreground">@{friend.username}</p>
                </div>
                <Link href={`/messages?user=${friend.id}`}>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </Link>
              </Card>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="requests">
        <div className="space-y-2">
          {optimisticRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            optimisticRequests.map((req) => (
              <Card key={req.id} className="p-4 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={req.requester.avatar_url || undefined} alt={req.requester.display_name || req.requester.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(req.requester.display_name || req.requester.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{req.requester.display_name || req.requester.username}</p>
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
