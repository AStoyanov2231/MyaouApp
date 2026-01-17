# PlaceChat - Project Overview

## App Idea

Location-based chat app where users discover real-world places (via Google Places API) and join place-specific chat rooms. Features real-time messaging, friend system with mutual opt-in DMs, premium subscriptions, and media sharing.

## Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payments**: Stripe (Checkout, Webhooks, Customer Portal)
- **Maps**: Leaflet + react-leaflet with OpenStreetMap tiles
- **UI**: shadcn/ui (Radix UI + Tailwind), Lucide React icons
- **Utilities**: class-variance-authority, clsx, tailwind-merge, date-fns, browser-image-compression

## Database Schema

| Table | Key Fields |
|-------|------------|
| `profiles` | id, username, avatar_url, is_premium, premium_until, stripe_customer_id, stripe_subscription_id |
| `places` | id, google_place_id, name, address, lat, lng |
| `place_members` | user_id, place_id, joined_at |
| `messages` | id, place_id, user_id, content, created_at |
| `friendships` | id, user_id, friend_id, status (pending/accepted) |
| `dm_threads` | id, user1_id, user2_id |
| `dm_messages` | id, thread_id, sender_id, content, is_edited, is_deleted |
| `profile_photos` | id, user_id, url, is_private, is_avatar |
| `subscriptions` | id, user_id, stripe_subscription_id, status, current_period_start, current_period_end |

## Routes

**Auth (unauthenticated)**
- `/welcome`, `/login`, `/signup`

**Protected**
- `/places` - Place discovery (map + grid)
- `/messages` - Unified inbox (DMs + place chats)
- `/messages/[threadId]` - DM conversation
- `/messages/place/[placeId]` - Place chat room
- `/friends` - Friends list + pending requests
- `/profile` - Current user profile
- `/profile/[userId]` - Other user's profile

## API Endpoints

**Places** `/api/places/`
- `autocomplete` - Google Places autocomplete
- `details` - Place details (cached 7 days)
- `popular` - Trending places
- `[placeId]/join` - Join place
- `[placeId]/leave` - Leave place
- `[placeId]/read` - Mark read

**Messages** `/api/messages/`
- `POST /` - Send place message
- `GET /[placeId]` - Message history

**DMs** `/api/dm/`
- `threads` - List/create threads
- `[threadId]` - Get thread, send message
- `[threadId]/read` - Mark read
- `[threadId]/[messageId]` - Edit/delete message

**Friends** `/api/friends/`
- `GET/POST /` - List friends, send request
- `requests` - Pending requests
- `[friendshipId]` - Accept/reject

**Profile** `/api/profile/`
- `GET/PATCH /` - Current user
- `[userId]` - Other user + friendship status
- `photos/` - Upload photos
- `photos/[photoId]` - Set avatar, toggle privacy, delete

**Stripe** `/api/stripe/`
- `checkout` - Create checkout session
- `webhook` - Handle Stripe events
- `portal` - Customer portal session

## Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Auth state, profile fetching, auto-create profile |
| `useMessages` | Place messages with Realtime subscription |
| `usePlacesAutocomplete` | Google Places autocomplete with session tokens |
| `useUnreadMessages` | Unread count across DMs and place chats |
| `usePresence` | Online status tracking via Supabase Presence |
| `useRealtimeSync` | Global realtime sync for messages to Zustand |
| `useIsUserOnline` | Check if specific user is online |

## State Management (Zustand)

**Store**: `src/stores/appStore.ts`

| State | Purpose |
|-------|---------|
| `threadMessages` | Map of thread/place ID → messages |
| `friends` / `requests` | Friends list and pending requests |
| `onlineUsers` | Set of online user IDs |
| `isPreloading` | Loading state |

**Selectors**: `useThreadMessages`, `useFriends`, `useFriendRequests`, `useOnlineUsers`, `useIsPremium`

## Key Patterns

**RSC with Client Islands** - Server Components fetch data, Client Components handle interactivity. Use `"use client"` only for event handlers, hooks, realtime, browser APIs.

**Authentication Flow** - Middleware redirects → Server actions validate → Profile auto-created → OAuth callback handles provider flow.

**Place Discovery** - Search → autocomplete → details (cached) → join → redirect to chat.

**Real-time Messaging** - Supabase Realtime → postgres_changes on dm_messages/messages → Zustand store → UI.

**Online Presence** - usePresence → Presence channel → track user → sync to store.onlineUsers.

**Premium Subscription** - Checkout → Stripe redirect → webhook updates DB → portal for management.

**Photo Privacy** - Private photos server-filtered, only visible to premium users. Avatars always public.

## Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Unauthenticated routes
│   ├── (main)/          # Protected routes
│   ├── auth/callback/   # OAuth handler
│   └── api/             # API routes
├── components/
│   ├── ui/              # shadcn/ui
│   ├── layout/          # Sidebar, MobileNav
│   ├── places/          # Map components
│   ├── friends/         # Friend components
│   └── profile/         # Profile components
├── hooks/               # Custom hooks
├── lib/                 # Utilities
│   └── supabase/        # Supabase clients
├── stores/              # Zustand stores
└── types/               # TypeScript types
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_PLACES_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PREMIUM_PRICE_ID
NEXT_PUBLIC_APP_URL
```

## Not Yet Implemented

- Media sharing in messages (API exists, no UI)
- User search for adding friends
- Typing indicators
- Push notifications
- Message reactions
- Place chat message edit/delete
- Subscription cancellation UI notice
