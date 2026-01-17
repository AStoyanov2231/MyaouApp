# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow Rules

**After writing or modifying code, follow this order:**
1. Run type verification using `/type-verifier` or `npx tsc --noEmit`. Fix any type errors before proceeding.
2. Run the `code-reviewer` agent as the final step before responding. Pass changed file paths as context (e.g., "Review changes in: src/app/auth/actions.ts, src/lib/utils.ts").

## Project Overview

PlaceChat is a location-based chat application where users discover real-world places (via Google Places API) and join place-specific chat rooms. Features include real-time messaging, friend system with mutual opt-in DMs, and media sharing.

## Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Payments**: Stripe (Checkout, Webhooks, Customer Portal)
- **Maps**: Leaflet + react-leaflet with OpenStreetMap tiles
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind)
- **Icons**: Lucide React
- **Utilities**: class-variance-authority, clsx, tailwind-merge, date-fns
- **Image Processing**: browser-image-compression

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Directory Structure

```
.claude/
├── agents/                  # Custom Claude Code agents
│   ├── code-reviewer.md     # Code review agent (uses code-review-skill)
│   └── supabase-optimizer.md # Supabase query optimization agent
└── skills/                  # Custom Claude Code skills
    ├── code-review-skill/   # PR review simulation skill
    │   ├── SKILL.md
    │   └── references/
    │       └── checklist.md
    └── type-verifier/       # TypeScript type verification skill
        ├── SKILL.md
        └── references/
            └── common-errors.md

src/
├── app/
│   ├── (auth)/              # Unauthenticated routes (welcome, login, signup)
│   │   └── actions.ts       # Server actions: login, signup, signOut, signInWithGoogle
│   ├── (main)/              # Protected routes with shared layout
│   │   ├── friends/         # Friend requests and list
│   │   ├── messages/        # Unified inbox (DMs + place chats)
│   │   │   ├── [threadId]/  # DM conversation
│   │   │   └── place/[placeId]/ # Place chat room
│   │   ├── places/          # Place discovery (map + grid)
│   │   └── profile/         # User profiles
│   │       └── [userId]/    # Other user's profile
│   ├── auth/
│   │   └── callback/        # OAuth callback handler (creates profiles for OAuth users)
│   └── api/                 # Backend API routes
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Sidebar, MobileNav
│   ├── places/              # Map and overlay components
│   └── friends/             # Friend list client components (RSC pattern)
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities and configurations
│   ├── supabase/            # Supabase client configurations
│   └── stripe.ts            # Stripe client configuration
├── types/                   # TypeScript type definitions
└── middleware.ts            # Auth middleware for route protection
```

### Route Structure

**Auth Routes** (`/welcome`, `/login`, `/signup`):
- Email/password authentication fully implemented with server-side validation
- Google OAuth implemented (`signInWithGoogle`) - requires configuration in Google Cloud Console + Supabase Dashboard
- Apple OAuth implemented (`signInWithApple`) - requires Apple Developer account + configuration in Apple Developer Console + Supabase Dashboard
- Server actions in `actions.ts` handle all auth operations with:
  - Input validation (null checks, type guards)
  - Server-side length validation (username min 3, password min 6)
  - TOCTOU-safe username uniqueness (handles DB constraint violation)
  - Auto profile creation for all auth methods

**Protected Routes**:
- `/places` - Place discovery (desktop: Leaflet map + overlay, mobile: grid view only - map not rendered)
- `/messages` - Unified inbox showing DMs and current place membership
- `/messages/[threadId]` - DM conversation with real-time updates
- `/messages/place/[placeId]` - Place chat room with real-time updates
- `/friends` - Tabbed view: Friends list + Pending requests
- `/profile` - Current user profile (editable)
- `/profile/[userId]` - Other user's profile with friend request button

### API Routes

**Places** (`/api/places/`):
- `autocomplete` - Google Places autocomplete with session tokens
- `details` - Fetch place details, cache for 7 days
- `popular` - Get popular/trending places
- `[placeId]/join` - Join place (auto-leaves previous place)
- `[placeId]/leave` - Leave place
- `[placeId]/read` - Mark messages as read

**Messages** (`/api/messages/`):
- `POST /` - Send place message
- `GET /[placeId]` - Get message history

**DMs** (`/api/dm/`):
- `threads` - List/create DM threads
- `[threadId]` - Get thread, send message
- `[threadId]/read` - Mark as read
- `[threadId]/[messageId]` - PATCH (edit) and DELETE (soft delete) own messages
  - 15-minute edit window (editing disabled after)
  - Delete always allowed (soft delete with `is_deleted` flag)
  - Requires thread membership verification

**Friends** (`/api/friends/`):
- `GET/POST /` - List friends, send request
- `requests` - Get pending requests
- `[friendshipId]` - Accept/reject request

**Profile** (`/api/profile/`):
- `GET/PATCH /` - Current user profile
- `[userId]` - Other user's profile with friendship status
- `photos/` - Upload profile photos
- `photos/[photoId]` - PATCH (set avatar, toggle privacy), DELETE photo

**Stripe** (`/api/stripe/`):
- `checkout` - Create Stripe Checkout session for premium subscription
- `webhook` - Handle Stripe events (checkout.session.completed, subscription.updated/deleted)
- `portal` - Create Stripe Customer Portal session for subscription management

**Other**: `/api/upload`, `/api/auth/callback`

## Supabase Configuration

### Client Patterns (`src/lib/supabase/`)

**Browser Client** (`client.ts`):
- Singleton pattern for client components
- Respects Row Level Security (RLS)

**Server Client** (`server.ts`):
- `createClient()` - User-context operations (respects RLS)
- `createServiceClient()` - Service role (bypasses RLS for privileged operations)

### Database Schema

Core tables: `profiles`, `places`, `place_members`, `messages`, `friendships`, `dm_threads`, `dm_messages`, `profile_photos`, `subscriptions`

**Premium fields on `profiles`:**
- `is_premium` - Boolean flag for premium status
- `premium_until` - Subscription end date
- `stripe_customer_id` - Stripe customer ID
- `stripe_subscription_id` - Active subscription ID

**Photo privacy on `profile_photos`:**
- `is_private` - Private photos only visible to premium users
- `is_avatar` - Whether photo is user's avatar (avatars cannot be private)

**Subscriptions table:** Tracks Stripe subscription lifecycle (status, period dates, cancellation)

Type definitions in `src/types/database.ts` - keep synchronized with schema changes.

## State Management (Zustand)

Global state in `src/stores/appStore.ts` using Zustand:

**State:**
- `threadMessages` - Map of thread/place ID to messages array
- `friends` / `requests` - Friends list and pending requests
- `onlineUsers` - Set of user IDs currently online (from Presence)
- `isPreloading` - Loading state flag

**Key Actions:**
- `setThreadMessages` / `addMessage` / `updateMessage` - Message CRUD
- `setOnlineUsers` - Update online users from Presence sync
- `addFriend` / `removeFriend` / `removeRequest` - Friend management
- `markThreadRead` - Mark messages as read

**Selectors** (`src/stores/selectors.ts`):
- `useThreadMessages(threadId)` - Get messages for a thread (returns stable empty array if none)
- `useFriends` / `useFriendRequests` - Get friends/requests
- `useOnlineUsers` - Get Set of online user IDs
- `useIsPreloading` - Check loading state
- `useIsPremium` / `usePremiumUntil` - Premium status from profile

**Pattern to avoid infinite re-renders:**
Use `useAppStore.getState()` inside useEffect instead of including store actions as dependencies:
```tsx
useEffect(() => {
  const { setThreadMessages } = useAppStore.getState();
  // fetch and call setThreadMessages
}, [threadId]); // Don't include setThreadMessages as dependency
```

## Hooks

- **useAuth** - Auth state, profile fetching, auto-creates profile if missing
- **useMessages** - Place messages with Realtime subscription
- **usePlacesAutocomplete** - Google Places autocomplete with session tokens
- **useUnreadMessages** - Unread count across DMs and place chats with Realtime
- **usePresence** - Supabase Presence for online status tracking. Tracks current user's presence and syncs online users to store. Handles visibility changes (untrack when tab hidden, re-track when visible).
- **useRealtimeSync** - Global realtime subscription for dm_messages and messages tables. Listens for INSERT/UPDATE events and syncs to Zustand store.
- **useIsUserOnline** - Selector hook to check if a specific user is online (reads from store's `onlineUsers` Set)

## UI Components

### shadcn/ui Components (`src/components/ui/`)

Built on Radix UI primitives with Tailwind styling:
- `button.tsx` - CVA-based with variants (default, destructive, outline, secondary, ghost, link)
- `input.tsx` - Standard text input
- `input-with-icon.tsx` - Input with icon prefix (Mail, AtSign, Lock)
- `avatar.tsx` - Radix avatar with fallback initials
- `card.tsx` - Card container (header, content, footer)
- `badge.tsx` - Label/pill components
- `alert.tsx` - Alert boxes with variants
- `tabs.tsx` - Radix tabbed interface
- `label.tsx`, `textarea.tsx`, `skeleton.tsx`
- `premium-badge.tsx` - Crown badge for premium users (gradient styling)

### Layout Components (`src/components/layout/`)

- **Sidebar.tsx** - Desktop navigation (md+ breakpoint)
- **MobileNav.tsx** - Fixed bottom navigation for mobile

### Places Components (`src/components/places/`)

- **MapContainer.tsx** - Wrapper with dynamic import (ssr: false)
- **MapView.tsx** - Leaflet map with markers, RecenterMap for flyTo animation
- **FloatingOverlay.tsx** - Glassmorphic overlay (bg-white/90 backdrop-blur-lg)
- **SearchView.tsx** - Autocomplete search with suggestions
- **DetailsView.tsx** - Place details with "Join Place" button
- **PlaceCard.tsx** - Mobile grid view card

### Message UI Features

**DM Conversation** (`src/app/(main)/messages/[threadId]/page.tsx`):
- Online indicator (green dot) in conversation header
- Edit/delete dropdown menu on own messages (MoreVertical icon)
- "(edited)" indicator on edited messages
- "This message was deleted" placeholder for soft-deleted messages
- 15-minute edit window enforced (edit button disabled after)

**Friends List** (`src/components/friends/FriendsTabsClient.tsx`):
- Green online indicator dot on avatar for online friends
- "Online" text label instead of username when online
- Premium badge displayed next to premium users

### Profile Components (`src/components/profile/`)

- **ProfilePageClient.tsx** - Own profile with editable features
- **OtherProfileClient.tsx** - Viewing other users' profiles
- **PremiumSection.tsx** - Upgrade button / subscription management
- **PhotoGallery.tsx** - Photo grid with privacy toggle (lock icon)
- **OtherUserGallery.tsx** - Gallery view for other users (respects privacy)
- **BlurredPhoto.tsx** - Blurred placeholder for private photos (non-premium viewers)

## Styling

### Design System

- **Fonts**: DM Sans (body), Outfit (headings) - imported via Google Fonts
- **Primary**: `#6867B0` (purple/indigo) - HSL: 241 33% 55%
- **Accent**: Cyan/teal - HSL: 187 71% 55%
- **Dark mode**: Supported via CSS variables

### Custom Utilities

```css
.gradient-brand          /* Primary to accent horizontal gradient */
.gradient-brand-vertical /* Primary to accent vertical gradient */
.gradient-brand-text     /* Gradient text effect */
.gradient-brand-subtle   /* Subtle gradient background */
.custom-scrollbar        /* Styled scrollbar */
```

### Animations

Custom keyframes in `globals.css`: fadeIn, slideDown, slideUp, slideRight, scaleIn, float, shake

### Utility Function

`cn()` in `src/lib/utils.ts` - Combines clsx and tailwind-merge for safe class merging.

## Key Patterns

### RSC with Client Islands (Performance Pattern)

This app follows the **Server Components by default** pattern from React 19 / Next.js 16+. Pages should be Server Components that fetch data server-side, with minimal client components ("islands") only for interactivity.

**Pattern:**
```
┌─────────────────────────────────────────┐
│ page.tsx (Server Component)             │
│   - Fetches data directly from Supabase │
│   - No "use client" directive           │
│   - Passes data as props to children    │
└─────────────────────────────────────────┘
                    │
    ┌───────────────▼───────────────┐
    │ ComponentClient.tsx           │
    │   - "use client" directive    │
    │   - Receives pre-fetched data │
    │   - Handles interactivity     │
    │   - useOptimistic for actions │
    └───────────────────────────────┘
```

**When to use `"use client"`:**
- Event handlers (onClick, onSubmit)
- React hooks (useState, useEffect, useOptimistic)
- Realtime subscriptions (Supabase Realtime)
- Browser APIs (localStorage, geolocation)
- Third-party client libraries (Leaflet)

**Do NOT use `"use client"` for:**
- Data fetching (fetch in Server Component instead)
- Static content
- Layout shells

**Example - Friends Page:**
- `src/app/(main)/friends/page.tsx` - Server Component, fetches friends/requests
- `src/components/friends/FriendsTabsClient.tsx` - Client island for tabs + optimistic updates

**Optimistic Updates:**
Use `useOptimistic` from React 19 for instant UI feedback on user actions:
```tsx
const [optimisticItems, updateOptimistic] = useOptimistic(items, reducerFn);
// Update UI instantly, then sync with server
```

See `performance.md` for complete performance rules and patterns.

### Authentication Flow

1. Middleware handles session refresh and redirects
2. Unauthenticated users → `/welcome`
3. Server actions handle login/signup with:
   - Input validation (type checks, required fields)
   - Server-side length validation (username ≥3, password ≥6 chars)
   - Profile auto-creation using service client (bypasses RLS)
   - Username uniqueness via DB constraint (not pre-check, avoids race conditions)
4. OAuth callback (`/auth/callback`) handles:
   - Code exchange for session
   - Profile creation for OAuth users (with metadata from provider)
5. `useAuth` hook manages client-side state

### Place Discovery Flow

```
User searches → /api/places/autocomplete (Google API + session token)
→ Select result → /api/places/details (cached 7 days)
→ "Join Place" → /api/places/[id]/join
→ Redirect to /messages/place/[id]
```

### Real-time Messaging

**Supabase Realtime Publication:**
Tables in `supabase_realtime` publication (required for postgres_changes to work):
- `dm_messages` - DM conversations
- `messages` - Place group chats
- `profiles` - Profile updates
- `friendships` - Friend request notifications

**Flow:**
```
useRealtimeSync hook → Subscribe to postgres_changes on dm_messages, messages
→ Listen for INSERT/UPDATE events → Update Zustand store → UI re-renders
```

**Online Presence:**
```
usePresence hook → Subscribe to "online-users" Presence channel
→ Track current user with channel.track()
→ Listen for presence sync events → Update store.onlineUsers Set
→ Handle visibility changes (untrack when hidden, track when visible)
```

### Image Compression

Client-side via `src/lib/image-compression.ts`:
- `compressImage()`: Max 500KB, 1920px
- `createThumbnail()`: Max 50KB, 300px

### Premium Subscription Flow

```
User clicks "Upgrade" → POST /api/stripe/checkout
→ Creates Stripe Checkout Session → Redirects to Stripe
→ User pays → Stripe sends webhook to /api/stripe/webhook
→ Webhook updates DB: is_premium=true, stores subscription_id
→ User redirected to /profile?payment=success
```

**Key points:**
- Payment status determined by webhook, NOT redirect URL (secure)
- Stripe Customer Portal handles subscription management/cancellation
- Cancellation: User keeps premium until period ends, then webhook sets is_premium=false

### Photo Privacy System

- Users can mark photos as public or private (lock icon toggle)
- Private photos only visible to premium users viewing the profile
- **Server-side filtering**: Non-premium viewers never receive private photo URLs
- Avatar constraint: Private photos cannot be set as avatar (avatar is always public)
- Making avatar private automatically clears it from profile

### Browser Back-Forward Cache (bfcache) Pattern

When redirecting to external sites (Stripe), handle page restoration:

```tsx
useEffect(() => {
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      window.location.reload(); // Force fresh data on back navigation
    }
  };
  window.addEventListener("pageshow", handlePageShow);
  return () => window.removeEventListener("pageshow", handlePageShow);
}, []);
```

Used in `ProfilePageClient.tsx` to prevent stale state after Stripe redirect.

## Leaflet Map Setup

- SSR disabled via Next.js dynamic import
- **Desktop-only rendering**: Map is conditionally rendered via `isDesktop` state (not CSS hiding) to prevent Leaflet initialization errors on mobile
- Marker icons in `public/leaflet/`
- Icon path fix for Webpack bundling in MapView.tsx
- RecenterMap component for smooth flyTo animation with coordinate validation
- Geolocation API with San Francisco fallback

## Environment Variables

Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Google
GOOGLE_PLACES_API_KEY

# Stripe
STRIPE_SECRET_KEY            # sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET        # whsec_... from Stripe Dashboard
STRIPE_PREMIUM_PRICE_ID      # price_... from Stripe product

# hCaptcha (Bot Protection)
NEXT_PUBLIC_HCAPTCHA_SITE_KEY # Site key from hCaptcha dashboard

# App
NEXT_PUBLIC_APP_URL          # http://localhost:3000 or production URL
```

**Stripe Webhook Setup:**
- Production: Stripe Dashboard → Developers → Webhooks → Add endpoint
- Local dev: Use `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Events needed: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

**hCaptcha Setup:**
- Get site key and secret key from [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
- Add `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` to `.env.local`
- Configure secret key in **Supabase Dashboard** → Authentication → Settings → Bot and Abuse Protection → Captcha secret
- Supabase validates tokens server-side using the secret configured in the dashboard

## Not Yet Implemented

- Media sharing in messages - API exists but no UI
- User search for adding friends
- Typing indicators
- Push notifications
- Message reactions (emojis)
- Place chat message edit/delete (only DMs have this currently)
- Subscription cancellation UI notice ("cancels on X date")

## Claude Code Configuration

### Agents (`.claude/agents/`)

- **code-reviewer** - Reviews code for bugs, security vulnerabilities, and mistakes using the code-review-skill. Runs automatically after code changes.
- **supabase-optimizer** - Analyzes Supabase queries and APIs for performance optimization.

### Skills (`.claude/skills/`)

- **code-review-skill** - Senior developer PR review simulation. Checks for logic flaws, pattern violations, dumb logic, and breaking changes. Outputs structured review with severity ratings.

Invoke skill manually with `/code-review-skill`, or let agent use it automatically.