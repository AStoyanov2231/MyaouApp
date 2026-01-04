"use client";
import { useState, useEffect } from "react";
import { Check, X, MessageCircle } from "lucide-react";
import { Button, Avatar, Spinner } from "@/components/ui";
import Link from "next/link";
import type { Profile, Friendship } from "@/types/database";

export default function FriendsPage() {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<(Friendship & { requester: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"friends" | "requests">("friends");

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
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>

      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === "friends" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setTab("friends")}
        >
          Friends ({friends.length})
        </Button>
        <Button
          variant={tab === "requests" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setTab("requests")}
        >
          Requests ({requests.length})
        </Button>
      </div>

      {tab === "friends" && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No friends yet</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="bg-white rounded-lg p-4 flex items-center gap-3">
                <Link href={`/profile/${friend.id}`}>
                  <Avatar src={friend.avatar_url} name={friend.display_name || friend.username} />
                </Link>
                <div className="flex-1">
                  <p className="font-medium">{friend.display_name || friend.username}</p>
                  <p className="text-sm text-gray-500">@{friend.username}</p>
                </div>
                <Link href={`/messages?user=${friend.id}`}>
                  <Button variant="ghost" size="sm">
                    <MessageCircle size={18} />
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-2">
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending requests</p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg p-4 flex items-center gap-3">
                <Avatar src={req.requester.avatar_url} name={req.requester.display_name || req.requester.username} />
                <div className="flex-1">
                  <p className="font-medium">{req.requester.display_name || req.requester.username}</p>
                  <p className="text-sm text-gray-500">@{req.requester.username}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRequest(req.id, "accepted")}>
                    <Check size={16} />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleRequest(req.id, "blocked")}>
                    <X size={16} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
