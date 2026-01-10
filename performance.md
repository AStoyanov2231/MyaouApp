# Performance Rules for Zero-Latency UX

> **Goal**: Every interaction must feel like 0ms latency. This document defines mandatory patterns for achieving McMaster-Carr-level instantaneous UX in PlaceChat.

---

## Table of Contents

1. [React 19 & Next.js 16+ Server Component Rules](#1-react-19--nextjs-16-server-component-rules)
2. [Optimistic UI for Messaging](#2-optimistic-ui-for-messaging)
3. [Data Streaming & Partial Prerendering (PPR)](#3-data-streaming--partial-prerendering-ppr)
4. [API Route Optimization](#4-api-route-optimization)
5. [Bundle & Asset Optimization](#5-bundle--asset-optimization)
6. [Prefetching Strategy](#6-prefetching-strategy)
7. [Middleware Optimization](#7-middleware-optimization)
8. [Do's and Don'ts Summary](#8-dos-and-donts-summary)

---

## 1. React 19 & Next.js 16+ Server Component Rules

### Principle: RSC by Default

Server Components are the default. Only add `"use client"` when you need browser APIs, event handlers, or React hooks that require client state.

### When to Use Server Components

| Use Case | Component Type | Reason |
|----------|---------------|--------|
| Data fetching | Server | Direct DB/API access, no waterfall |
| Static content | Server | Zero JS shipped to client |
| SEO-critical pages | Server | Full HTML on first paint |
| Layout shells | Server | Instant static shell |

### When `"use client"` is Acceptable

| Use Case | Reason |
|----------|--------|
| Event handlers (onClick, onSubmit) | Browser API |
| useState, useEffect, useRef | Client hooks |
| Realtime subscriptions | WebSocket/Supabase Realtime |
| Browser APIs (localStorage, geolocation) | Not available on server |
| Third-party client libraries (Leaflet) | No SSR support |

### Pattern: RSC with Client Islands

```tsx
// BAD: Entire page is client component
"use client";
export default function MessagesPage() {
  const [threads, setThreads] = useState([]);
  useEffect(() => {
    fetch('/api/dm/threads').then(r => r.json()).then(setThreads);
  }, []);
  return <ThreadList threads={threads} />;
}

// GOOD: Server component with client islands
// app/(main)/messages/page.tsx (Server Component - NO directive)
import { Suspense } from 'react';
import { ThreadListClient } from '@/components/messages/ThreadListClient';
import { ThreadListSkeleton } from '@/components/messages/ThreadListSkeleton';
import { createClient } from '@/lib/supabase/server';

async function getThreads(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('dm_threads')
    .select('*, participant_1:profiles!participant_1_id(*), participant_2:profiles!participant_2_id(*)')
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  return data ?? [];
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const threads = await getThreads(user!.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <Suspense fallback={<ThreadListSkeleton />}>
        <ThreadListClient initialThreads={threads} userId={user!.id} />
      </Suspense>
    </div>
  );
}

// components/messages/ThreadListClient.tsx
"use client";
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ThreadListClient({ initialThreads, userId }) {
  const [threads, setThreads] = useState(initialThreads);
  const supabase = createClient();

  // Only realtime subscription logic here
  useEffect(() => {
    const channel = supabase
      .channel('threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_messages' },
        () => { /* Update specific thread, don't refetch all */ }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return <ul>{threads.map(t => <ThreadItem key={t.id} thread={t} />)}</ul>;
}
```

### Pattern: `use()` Hook for Data Fetching

Pass promises from Server Components to Client Components. The client uses `use()` to unwrap them with Suspense.

```tsx
// Server Component passes promise (NOT awaited)
// app/(main)/messages/place/[placeId]/page.tsx
import { ChatClient } from '@/components/chat/ChatClient';
import { createClient } from '@/lib/supabase/server';

async function getMessages(placeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(*)')
    .eq('place_id', placeId)
    .order('created_at', { ascending: true })
    .limit(50);
  return data ?? [];
}

export default async function PlaceChatPage({ params }) {
  const { placeId } = await params;

  // Don't await - pass the promise
  const messagesPromise = getMessages(placeId);

  return <ChatClient placeId={placeId} messagesPromise={messagesPromise} />;
}

// Client Component uses use() hook
"use client";
import { use, useState, useEffect } from 'react';
import type { Message } from '@/types/database';

interface Props {
  placeId: string;
  messagesPromise: Promise<Message[]>;
}

export function ChatClient({ placeId, messagesPromise }: Props) {
  // use() suspends until promise resolves
  const initialMessages = use(messagesPromise);
  const [messages, setMessages] = useState(initialMessages);

  // Realtime subscription for new messages
  useEffect(() => {
    // Subscribe to new messages...
  }, [placeId]);

  return <MessageList messages={messages} />;
}
```

---

## 2. Optimistic UI for Messaging

### Principle: Instant Feedback

The UI must update **immediately** when a user sends a message. Server confirmation happens in the background.

### Pattern: `useOptimistic` for Message Sending

```tsx
"use client";
import { useOptimistic, useTransition, useRef } from 'react';
import type { Message } from '@/types/database';

interface OptimisticMessage extends Message {
  isPending?: boolean;
}

interface ChatInputProps {
  placeId: string;
  userId: string;
  onMessageSent: (message: Message) => void;
}

export function ChatInput({ placeId, userId, onMessageSent }: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  async function sendMessage(formData: FormData) {
    const content = formData.get('content') as string;
    if (!content.trim()) return;

    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: userId,
      place_id: placeId,
      created_at: new Date().toISOString(),
      isPending: true,
    };

    // Update UI immediately
    onMessageSent(optimisticMessage);
    formRef.current?.reset();

    startTransition(async () => {
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: placeId, content }),
        });

        if (!res.ok) throw new Error('Failed to send');

        const realMessage = await res.json();
        // Replace optimistic with real message (handled by realtime subscription)
      } catch (error) {
        // Rollback: Remove optimistic message
        // Show error toast
        console.error('Message failed:', error);
      }
    });
  }

  return (
    <form ref={formRef} action={sendMessage} className="flex gap-2 p-4 border-t">
      <input
        name="content"
        type="text"
        placeholder="Type a message..."
        className="flex-1 px-4 py-2 border rounded-full"
        autoComplete="off"
        disabled={isPending}
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2 bg-primary text-white rounded-full disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
```

### Pattern: Message List with Optimistic State

```tsx
"use client";
import { useOptimistic } from 'react';
import type { Message } from '@/types/database';

interface Props {
  initialMessages: Message[];
  currentUserId: string;
}

export function MessageListWithOptimistic({ initialMessages, currentUserId }: Props) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<
    Message[],
    Message
  >(initialMessages, (state, newMessage) => [...state, newMessage]);

  return (
    <div className="flex flex-col gap-2 p-4">
      {optimisticMessages.map((msg) => (
        <div
          key={msg.id}
          className={`max-w-[70%] p-3 rounded-lg ${
            msg.sender_id === currentUserId
              ? 'ml-auto bg-primary text-white'
              : 'bg-muted'
          } ${msg.isPending ? 'opacity-70' : ''}`}
        >
          {msg.content}
          {msg.isPending && (
            <span className="text-xs ml-2">Sending...</span>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Pattern: Friend Request Optimistic Update

```tsx
"use client";
import { useOptimistic, useTransition } from 'react';

type RequestStatus = 'pending' | 'accepted' | 'rejected';

export function FriendRequestActions({ requestId, onStatusChange }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<RequestStatus | null>(null);

  async function handleAction(action: 'accept' | 'reject') {
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Immediate UI update
    setOptimisticStatus(newStatus);

    startTransition(async () => {
      try {
        await fetch(`/api/friends/${requestId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        onStatusChange(newStatus);
      } catch {
        // Rollback happens automatically when optimistic state resets
      }
    });
  }

  if (optimisticStatus) {
    return <span className="text-muted-foreground">{optimisticStatus}</span>;
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => handleAction('accept')} disabled={isPending}>
        Accept
      </button>
      <button onClick={() => handleAction('reject')} disabled={isPending}>
        Reject
      </button>
    </div>
  );
}
```

---

## 3. Data Streaming & Partial Prerendering (PPR)

### Principle: Static Shell, Dynamic Content

The page shell (navigation, layout) loads instantly as static HTML. Dynamic content streams in progressively.

### Enable PPR in next.config.ts

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
};

export default nextConfig;
```

### Pattern: Suspense Boundaries for Streaming

```tsx
// app/(main)/layout.tsx
import { Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarSkeleton } from '@/components/layout/SidebarSkeleton';
import { createClient } from '@/lib/supabase/server';

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return profile;
}

export default async function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Static shell - renders immediately */}
      <aside className="w-64 border-r">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarWithProfile />
        </Suspense>
      </aside>

      {/* Dynamic content streams in */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

async function SidebarWithProfile() {
  const profile = await getProfile();
  return <Sidebar profile={profile} />;
}
```

### Pattern: Streamed Message List

```tsx
// app/(main)/messages/place/[placeId]/page.tsx
import { Suspense } from 'react';
import { MessagesSkeleton } from '@/components/chat/MessagesSkeleton';
import { ChatHeader } from '@/components/chat/ChatHeader';

export default async function PlaceChatPage({ params }) {
  const { placeId } = await params;

  return (
    <div className="flex flex-col h-full">
      {/* Static header - instant */}
      <ChatHeader placeId={placeId} />

      {/* Messages stream in */}
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesContainer placeId={placeId} />
      </Suspense>

      {/* Static input - instant */}
      <ChatInputContainer placeId={placeId} />
    </div>
  );
}

async function MessagesContainer({ placeId }) {
  const messages = await getMessages(placeId); // Slow query
  return <MessageList messages={messages} />;
}
```

### Pattern: Loading Skeletons

```tsx
// components/chat/MessagesSkeleton.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function MessagesSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 3 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <Skeleton
            className={`h-12 rounded-lg ${
              i % 3 === 0 ? 'w-48' : 'w-64'
            }`}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## 4. API Route Optimization

### Principle: Edge-First, Single Query

API routes should run on Edge Runtime when possible and use single optimized queries instead of N+1 patterns.

### Edge Runtime Declaration

```ts
// app/api/friends/requests/route.ts
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // Simple query - perfect for Edge
  const supabase = await createClient();
  const { data } = await supabase
    .from('friendships')
    .select('*, requester:profiles!requester_id(*)')
    .eq('addressee_id', userId)
    .eq('status', 'pending');

  return NextResponse.json(data);
}
```

### Routes Suitable for Edge Runtime

| Route | Methods | Reason |
|-------|---------|--------|
| `/api/friends/requests` | GET | Simple filtered query |
| `/api/friends/[id]` | PATCH, DELETE | Single update/delete |
| `/api/dm/[threadId]` | POST | Single insert |
| `/api/dm/[threadId]/read` | POST | Single update |
| `/api/profile` | GET, PATCH | Simple CRUD |
| `/api/places/[id]/leave` | POST | Single delete |
| `/api/places/[id]/read` | POST | Single update |
| `/api/places/popular` | GET | Cached query |

### Pattern: Eliminate N+1 Queries

```ts
// BAD: N+1 pattern (current in /api/dm/threads)
const dmThreads = await Promise.all(
  (threads || []).map(async (thread) => {
    const { count } = await supabase
      .from('dm_messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', thread.id)
      .eq('is_read', false)
      .neq('sender_id', user.id);
    return { ...thread, unread_count: count || 0 };
  })
);

// GOOD: Single query with aggregation
const { data: threads } = await supabase
  .from('dm_threads')
  .select(`
    *,
    participant_1:profiles!participant_1_id(id, username, avatar_url),
    participant_2:profiles!participant_2_id(id, username, avatar_url),
    messages:dm_messages(
      id,
      content,
      created_at,
      is_read,
      sender_id
    )
  `)
  .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
  .order('updated_at', { ascending: false });

// Calculate unread client-side or use a database view
const threadsWithUnread = threads?.map(t => ({
  ...t,
  unread_count: t.messages.filter(m => !m.is_read && m.sender_id !== userId).length,
  last_message: t.messages[t.messages.length - 1],
}));
```

### Pattern: Parallel Queries

```ts
// BAD: Sequential queries
const { data: thread } = await supabase.from('dm_threads').select('*').eq('id', threadId).single();
const { data: messages } = await supabase.from('dm_messages').select('*').eq('thread_id', threadId);
const { data: participants } = await supabase.from('profiles').select('*').in('id', [thread.participant_1_id, thread.participant_2_id]);

// GOOD: Parallel execution
const [threadResult, messagesResult] = await Promise.all([
  supabase
    .from('dm_threads')
    .select('*, participant_1:profiles!participant_1_id(*), participant_2:profiles!participant_2_id(*)')
    .eq('id', threadId)
    .single(),
  supabase
    .from('dm_messages')
    .select('*, sender:profiles!sender_id(*)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(50),
]);

const thread = threadResult.data;
const messages = messagesResult.data;
```

### Pattern: HTTP Caching Headers

```ts
// app/api/places/popular/route.ts
export const runtime = 'edge';

export async function GET() {
  const supabase = await createClient();
  const { data: places } = await supabase
    .from('places')
    .select('*')
    .order('member_count', { ascending: false })
    .limit(20);

  return NextResponse.json({ places }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

// Private data (user-specific)
export async function GET() {
  // ... fetch user data
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
    },
  });
}
```

---

## 5. Bundle & Asset Optimization

### Principle: Ship Less JavaScript

Every kilobyte of JS delays interactivity. Optimize images, fonts, and code splitting.

### Mandatory: Use `next/image`

```tsx
// BAD: Raw img tag
<img src={place.cached_photo_url} alt={place.name} className="rounded-lg" />

// GOOD: Next.js Image with optimization
import Image from 'next/image';

<Image
  src={place.cached_photo_url || '/placeholder-place.jpg'}
  alt={place.name}
  width={400}
  height={300}
  className="rounded-lg object-cover"
  placeholder="blur"
  blurDataURL="/placeholder-blur.jpg"
  sizes="(max-width: 768px) 100vw, 400px"
/>

// For avatars
<Image
  src={profile.avatar_url || '/default-avatar.png'}
  alt={profile.username}
  width={40}
  height={40}
  className="rounded-full"
/>
```

### Mandatory: Use `next/font`

```tsx
// BAD: CSS import (blocks render, no subsetting)
// globals.css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

// GOOD: next/font (automatic optimization, subsetting, self-hosting)
// app/layout.tsx
import { DM_Sans, Outfit } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${outfit.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

// tailwind.config.ts
fontFamily: {
  sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
  display: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
},
```

### Strict Tailwind-Only CSS

```css
/* BAD: Custom keyframes in globals.css */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* GOOD: Define in tailwind.config.ts */
// tailwind.config.ts
theme: {
  extend: {
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      slideUp: {
        '0%': { transform: 'translateY(10px)', opacity: '0' },
        '100%': { transform: 'translateY(0)', opacity: '1' },
      },
    },
    animation: {
      'fade-in': 'fadeIn 0.2s ease-out',
      'slide-up': 'slideUp 0.3s ease-out',
    },
  },
},
```

### Dynamic Imports for Heavy Components

```tsx
// Pattern: Lazy load map component (already implemented correctly)
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

// Pattern: Lazy load modals and pickers
const EmojiPicker = dynamic(() => import('@emoji-mart/react'), {
  ssr: false,
  loading: () => <Skeleton className="w-64 h-64" />,
});

const ImageUploadModal = dynamic(() => import('./ImageUploadModal'), {
  loading: () => null,
});

// Usage: Only load when needed
{showEmojiPicker && <EmojiPicker onSelect={handleEmoji} />}
{showUploadModal && <ImageUploadModal onClose={() => setShowUploadModal(false)} />}
```

### Icon Optimization

```tsx
// GOOD: Import only needed icons (tree-shaking works)
import { Send, ArrowLeft, MoreVertical } from 'lucide-react';

// BAD: Import entire library
import * as Icons from 'lucide-react';
```

---

## 6. Prefetching Strategy

### Principle: Pre-warm Before Navigation

Fetch data before the user clicks. Use hover, focus, and viewport triggers.

### Pattern: Prefetch Chat Data on Hover

```tsx
"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface ThreadLinkProps {
  threadId: string;
  children: React.ReactNode;
}

export function ThreadLink({ threadId, children }: ThreadLinkProps) {
  const router = useRouter();

  const prefetchThread = useCallback(() => {
    // Prefetch the route (Next.js handles this)
    router.prefetch(`/messages/${threadId}`);

    // Pre-warm API data cache
    fetch(`/api/dm/${threadId}`, {
      priority: 'low',
      cache: 'force-cache',
    }).catch(() => {}); // Ignore errors, it's just pre-warming
  }, [threadId, router]);

  return (
    <Link
      href={`/messages/${threadId}`}
      onMouseEnter={prefetchThread}
      onFocus={prefetchThread}
      prefetch={true}
    >
      {children}
    </Link>
  );
}
```

### Pattern: Prefetch Place Details on Hover

```tsx
"use client";
import { useCallback } from 'react';

export function PlaceCard({ place, onSelect }) {
  const prefetchDetails = useCallback(() => {
    // Pre-warm the place details API
    fetch(`/api/places/details?place_id=${place.place_id}`, {
      priority: 'low',
    }).catch(() => {});
  }, [place.place_id]);

  return (
    <button
      onClick={() => onSelect(place)}
      onMouseEnter={prefetchDetails}
      onFocus={prefetchDetails}
      className="p-4 border rounded-lg hover:bg-muted transition-colors"
    >
      <h3>{place.name}</h3>
      <p>{place.address}</p>
    </button>
  );
}
```

### Pattern: Intersection Observer Prefetching

```tsx
"use client";
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function ThreadListItem({ thread }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Prefetch when scrolled into view
            router.prefetch(`/messages/${thread.id}`);
            observer.unobserve(element);
          }
        });
      },
      { rootMargin: '100px' } // Prefetch 100px before visible
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [thread.id, router]);

  return (
    <div ref={ref}>
      <ThreadLink threadId={thread.id}>
        {/* Thread content */}
      </ThreadLink>
    </div>
  );
}
```

### Pattern: Client-Side Cache with Zustand

```tsx
// stores/messageCache.ts
import { create } from 'zustand';
import type { Message } from '@/types/database';

interface MessageCacheState {
  threads: Record<string, Message[]>;
  setMessages: (threadId: string, messages: Message[]) => void;
  addMessage: (threadId: string, message: Message) => void;
  getMessages: (threadId: string) => Message[] | undefined;
}

export const useMessageCache = create<MessageCacheState>((set, get) => ({
  threads: {},

  setMessages: (threadId, messages) =>
    set((state) => ({
      threads: { ...state.threads, [threadId]: messages },
    })),

  addMessage: (threadId, message) =>
    set((state) => ({
      threads: {
        ...state.threads,
        [threadId]: [...(state.threads[threadId] || []), message],
      },
    })),

  getMessages: (threadId) => get().threads[threadId],
}));

// Usage in component
function ChatView({ threadId }) {
  const cachedMessages = useMessageCache((s) => s.getMessages(threadId));
  const setMessages = useMessageCache((s) => s.setMessages);

  // Use cache if available, fetch if not
  const [messages, setLocalMessages] = useState(cachedMessages || []);

  useEffect(() => {
    if (!cachedMessages) {
      fetch(`/api/dm/${threadId}`)
        .then((r) => r.json())
        .then((data) => {
          setMessages(threadId, data.messages);
          setLocalMessages(data.messages);
        });
    }
  }, [threadId, cachedMessages]);
}
```

---

## 7. Middleware Optimization

### Principle: Minimal Auth Overhead

Middleware runs on every request. Keep it fast by avoiding database calls.

### Pattern: Session-Based Auth (No Database)

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // FAST: Read session from cookie (no network)
  const { data: { session } } = await supabase.auth.getSession();

  // Only call getUser() when session might be stale (optional refresh)
  // This is rarely needed and can be removed for maximum speed
  // const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.match(/^\/(welcome|login|signup)/);
  const isProtectedPage = request.nextUrl.pathname.match(/^\/(messages|friends|profile|places)/);

  if (!session && isProtectedPage) {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/places', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Only run on app routes, skip static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Pattern: Selective Route Matching

```ts
// Only protect routes that need auth
export const config = {
  matcher: [
    '/messages/:path*',
    '/friends/:path*',
    '/profile/:path*',
    '/places/:path*',
    '/welcome',
    '/login',
    '/signup',
  ],
};
```

---

## 8. Do's and Don'ts Summary

### Server Components

| Do | Don't |
|----|-------|
| Keep pages as Server Components | Add `"use client"` at page level |
| Fetch data in Server Components | Use `useEffect` + `fetch` for initial data |
| Pass data as props to client islands | Fetch same data in multiple components |
| Use `use()` hook for promise unwrapping | Create loading states with `useState` |

### Optimistic UI

| Do | Don't |
|----|-------|
| Update UI immediately on user action | Wait for server response |
| Use `useOptimistic` for pending states | Use loading spinners for every action |
| Handle rollback on failure | Leave failed optimistic updates visible |
| Show subtle pending indicators | Block UI during network requests |

### Data Fetching

| Do | Don't |
|----|-------|
| Use single queries with JOINs | Loop and query (N+1 pattern) |
| Run independent queries in parallel | Chain sequential queries |
| Add `Cache-Control` headers | Fetch fresh data every request |
| Use Edge Runtime for simple routes | Use Node.js for simple CRUD |

### Bundle Optimization

| Do | Don't |
|----|-------|
| Use `next/image` for all images | Use raw `<img>` tags |
| Use `next/font` for fonts | Import fonts via CSS `@import` |
| Dynamic import heavy components | Import everything at top level |
| Define animations in Tailwind config | Write custom CSS keyframes |
| Import specific icons | Import entire icon library |

### Prefetching

| Do | Don't |
|----|-------|
| Prefetch on hover/focus | Wait for click to start loading |
| Use `router.prefetch()` for routes | Rely solely on viewport prefetch |
| Pre-warm API data cache | Fetch only when component mounts |
| Use Intersection Observer for lists | Load all list item data upfront |

### Middleware

| Do | Don't |
|----|-------|
| Use `getSession()` (reads cookie) | Use `getUser()` (database call) |
| Match only necessary routes | Run middleware on static assets |
| Keep middleware logic minimal | Add complex business logic |

---

## Quick Reference: Performance Checklist

Before every PR, verify:

- [ ] No new `"use client"` directives at page level
- [ ] No `useEffect` + `fetch` for initial data (use RSC)
- [ ] `useOptimistic` used for user actions
- [ ] No N+1 query patterns in API routes
- [ ] `next/image` used for all images
- [ ] No CSS `@import` for fonts
- [ ] Heavy components use `dynamic()` import
- [ ] Prefetching implemented for navigation links
- [ ] API routes have appropriate `Cache-Control` headers
- [ ] Edge Runtime declared where applicable

---

## Lighthouse Targets

| Metric | Target | Current |
|--------|--------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | TBD |
| FID (First Input Delay) | < 100ms | TBD |
| CLS (Cumulative Layout Shift) | < 0.1 | TBD |
| TTI (Time to Interactive) | < 3.5s | TBD |
| TBT (Total Blocking Time) | < 200ms | TBD |

Run `npx lighthouse https://your-app.vercel.app --view` to measure.
