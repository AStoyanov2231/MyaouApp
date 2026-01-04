"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import type { DMThread, Profile } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

type ThreadWithParticipants = DMThread & {
  participant_1: Profile;
  participant_2: Profile;
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dm/threads")
      .then((r) => r.json())
      .then((d) => {
        setThreads(d.threads || []);
        setLoading(false);
      });
  }, []);

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
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  const getOtherParticipant = (thread: ThreadWithParticipants) =>
    thread.participant_1_id === user?.id ? thread.participant_2 : thread.participant_1;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>

      {threads.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No conversations yet</p>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const other = getOtherParticipant(thread);
            return (
              <Link
                key={thread.id}
                href={`/messages/${thread.id}`}
                className="bg-white rounded-lg p-4 flex items-center gap-3 hover:bg-gray-50"
              >
                <Avatar src={other.avatar_url} name={other.display_name || other.username} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{other.display_name || other.username}</p>
                  {thread.last_message_preview && (
                    <p className="text-sm text-gray-500 truncate">{thread.last_message_preview}</p>
                  )}
                </div>
                {thread.last_message_at && (
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
