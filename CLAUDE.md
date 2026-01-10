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
│   └── places/              # Map and overlay components
├── hooks/                   # Custom React hooks
├── lib/                     # Utilities and configurations
│   └── supabase/            # Supabase client configurations
├── types/                   # TypeScript type definitions
└── middleware.ts            # Auth middleware for route protection
```

### Route Structure

**Auth Routes** (`/welcome`, `/login`, `/signup`):
- Email/password authentication fully implemented with server-side validation
- Google OAuth backend implemented (`signInWithGoogle`), UI buttons show "Coming soon"
- Apple OAuth not yet implemented
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

**Friends** (`/api/friends/`):
- `GET/POST /` - List friends, send request
- `requests` - Get pending requests
- `[friendshipId]` - Accept/reject request

**Profile** (`/api/profile/`):
- `GET/PATCH /` - Current user profile
- `[userId]` - Other user's profile with friendship status

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

Core tables: `profiles`, `places`, `place_members`, `messages`, `friendships`, `dm_threads`, `dm_messages`

Type definitions in `src/types/database.ts` - keep synchronized with schema changes.

## Hooks

- **useAuth** - Auth state, profile fetching, auto-creates profile if missing
- **useMessages** - Place messages with Realtime subscription
- **usePlacesAutocomplete** - Google Places autocomplete with session tokens
- **useUnreadMessages** - Unread count across DMs and place chats with Realtime

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

```
useMessages hook → Initial fetch → Supabase Realtime subscription
→ Listen for INSERT/UPDATE/DELETE → Auto-update UI
```

### Image Compression

Client-side via `src/lib/image-compression.ts`:
- `compressImage()`: Max 500KB, 1920px
- `createThumbnail()`: Max 50KB, 300px

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
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_PLACES_API_KEY
NEXT_PUBLIC_APP_URL
```

## Not Yet Implemented

- OAuth UI buttons - backend ready for Google, buttons show "Coming soon"
- Apple OAuth - not implemented
- Media sharing in messages - API exists but no UI
- User search for adding friends
- Typing indicators
- Push notifications
- Message editing/reactions

## Claude Code Configuration

### Agents (`.claude/agents/`)

- **code-reviewer** - Reviews code for bugs, security vulnerabilities, and mistakes using the code-review-skill. Runs automatically after code changes.
- **supabase-optimizer** - Analyzes Supabase queries and APIs for performance optimization.

### Skills (`.claude/skills/`)

- **code-review-skill** - Senior developer PR review simulation. Checks for logic flaws, pattern violations, dumb logic, and breaking changes. Outputs structured review with severity ratings.

Invoke skill manually with `/code-review-skill`, or let agent use it automatically.