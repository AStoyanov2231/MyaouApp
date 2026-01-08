"use client";
import { useState, useEffect } from "react";
import { Check, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { Profile, Friendship } from "@/types/database";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<(Friendship & { requester: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/friends").then((r) => r.json()),
      fetch("/api/friends/requests").then((r) => r.json()),
    ]).then(([friendsData, requestsData]) => {
      setFriends(friendsData.friends || []);
      setRequests(requestsData.requests || []);
      setLoading(false);
    });
  }, []);

  const handleRequest = async (id: string, status: "accepted" | "blocked") => {
    await fetch(`/api/friends/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (status === "accepted") {
      const req = requests.find((r) => r.id === id);
      if (req) setFriends((prev) => [...prev, req.requester]);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-10 w-64 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="friends">Friends ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <div className="space-y-2">
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No friends yet</p>
            ) : (
              friends.map((friend) => (
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
            {requests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No pending requests</p>
            ) : (
              requests.map((req) => (
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
                    <Button size="sm" onClick={() => handleRequest(req.id, "accepted")}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleRequest(req.id, "blocked")}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
