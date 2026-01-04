"use client";
import { useEffect, useState, useRef, use } from "react";
import { ArrowLeft, Send, Users } from "lucide-react";
import Link from "next/link";
import { Button, Input, Avatar, Spinner } from "@/components/ui";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import type { Place } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

export default function ChatRoomPage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = use(params);
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useMessages(placeId);
  const [place, setPlace] = useState<Place | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/places/${placeId}`)
      .then((r) => r.json())
      .then((d) => {
        setPlace(d.place);
        setIsMember(d.isMember);
      });
  }, [placeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoin = async () => {
    await fetch(`/api/places/${placeId}/join`, { method: "POST" });
    setIsMember(true);
  };

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
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b p-4 flex items-center gap-4">
        <Link href="/places" className="md:hidden">
          <ArrowLeft />
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold">{place.name}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Users size={14} /> {place.member_count} members
          </p>
        </div>
        {!isMember && (
          <Button onClick={handleJoin} size="sm">
            Join Chat
          </Button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender_id === user?.id ? "flex-row-reverse" : ""}`}
            >
              <Avatar
                src={msg.sender?.avatar_url}
                name={msg.sender?.display_name || msg.sender?.username}
                size="sm"
              />
              <div
                className={`max-w-[70%] ${
                  msg.sender_id === user?.id
                    ? "bg-primary text-white rounded-l-xl rounded-tr-xl"
                    : "bg-white rounded-r-xl rounded-tl-xl"
                } p-3 shadow-sm`}
              >
                {msg.sender_id !== user?.id && (
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    {msg.sender?.display_name || msg.sender?.username}
                  </p>
                )}
                {msg.media_url && (
                  <img src={msg.media_url} alt="" className="rounded mb-2 max-w-full" />
                )}
                <p>{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender_id === user?.id ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isMember ? (
        <form onSubmit={handleSend} className="bg-white border-t p-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || sending}>
            <Send size={18} />
          </Button>
        </form>
      ) : (
        <div className="bg-gray-100 p-4 text-center">
          <p className="text-gray-600">Join this chat to send messages</p>
        </div>
      )}
    </div>
  );
}
