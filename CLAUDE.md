# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PlaceChat is a location-based chat application where users discover real-world places (via Google Places API) and join place-specific chat rooms. Features include real-time messaging, friend system with mutual opt-in DMs, and media sharing.

## Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Maps**: Leaflet + react-leaflet with OpenStreetMap tiles
- **Icons**: Lucide React
- **State**: Zustand
- **Image Processing**: browser-image-compression

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### High-Level Overview

The app follows a **hybrid Next.js architecture** with server-side rendering, API routes, and client-side real-time updates:

1. **Frontend (Client)**: React 19 components with Zustand for state management
2. **Backend (Server)**: Next.js API routes + Supabase PostgreSQL + Row Level Security
3. **Real-time**: Supabase Realtime for live message updates
4. **Authentication**: Supabase Auth with middleware-based session management
5. **Storage**: Supabase Storage for user-uploaded images/media

### Directory Structure

```
src/
├── app/
│   ├── (auth)/          # Unauthenticated routes (welcome, login, signup)
│   ├── (main)/          # Protected routes with shared layout
│   │   ├── friends/     # Friend requests and list
│   │   ├── messages/    # DM threads and place chats
│   │   ├── places/      # Place discovery and chat rooms
│   │   └── profile/     # User profiles
│   └── api/             # Backend API routes
├── components/
│   ├── ui/              # Reusable UI components (Button, Input, etc.)
│   ├── places/          # Places map and overlay components
│   └── [feature]/       # Feature-specific components
├── hooks/               # Custom React hooks (useAuth, useMessages, etc.)
├── lib/                 # Utilities and configurations
│   ├── supabase/        # Supabase client configurations
│   └── image-compression.ts
├── stores/              # Zustand state stores
├── types/               # TypeScript type definitions
└── middleware.ts        # Auth middleware for route protection
```

### Route Structure

**Authentication Routes** (`src/app/(auth)/`):
- `/welcome` - Landing page with OAuth buttons (Apple, Google) and email signup option
- `/login` - Email/password login with modern design
- `/signup` - Email/password signup with modern design
- Server actions in `actions.ts` handle all auth operations

**Protected Routes** (`src/app/(main)/`):
- `/places` - Interactive map-based place discovery (desktop: map + overlay, mobile: grid)
- `/messages` - Unified inbox (DMs + place chats)
- `/messages/[threadId]` - Direct message thread
- `/messages/place/[placeId]` - Place chat room (users join directly from places map)
- `/friends` - Friend requests and friend list
- `/profile` - Current user profile
- `/profile/[userId]` - View other user profiles

**API Routes** (`src/app/api/`):
- `/api/places/*` - Place search, join, leave, read status
- `/api/messages/*` - Fetch and send place messages
- `/api/dm/*` - DM threads, messages, read status
- `/api/friends/*` - Friend requests, accept, remove
- `/api/profile/*` - Profile CRUD operations
- `/api/upload` - Image upload to Supabase Storage

### Data Flow Patterns

**1. Place Discovery Flow (Map-Based):**
```
Desktop: User views interactive Leaflet map → Searches place in overlay →
Results update map markers and list → Click place → View details in overlay →
Click "Join Place" → API creates place_member → Redirect to chat

Mobile: User views grid → Searches places → Click place card →
API creates place_member → Redirect to chat

Search: API route → Check cache → Google Places API → Cache result → Return to client
Map: Leaflet centers on selected place with smooth animation (flyTo)
```

**2. Place Chat Flow:**
```
User joins directly from map/grid → API creates place_member →
Redirects to /messages/place/[placeId] → useMessages hook fetches history →
Subscribes to Realtime updates → User sends message → API route →
Supabase insert → Realtime broadcasts to all members
```

**3. Friend System Flow:**
```
User sends request → API creates friendship (pending) →
Recipient accepts → API updates status (accepted) →
Both users can now DM → dm_threads table links friendships
```

**4. DM Flow:**
```
User selects friend → API creates/retrieves dm_thread →
Messages sent to dm_messages → Real-time subscription updates both users
```

### Supabase Client Architecture

Two client patterns exist in `src/lib/supabase/`:

**Browser Client** (`client.ts`):
- Singleton pattern for consistent session across components
- Used in client components and hooks
- Respects Row Level Security (RLS)
- Manages user authentication state

**Server Client** (`server.ts`):
- `createClient()` - For user-context operations (respects RLS)
- `createServiceClient()` - For service role operations (bypasses RLS)
- Used in API routes, server actions, and middleware
- Service client used only for privileged operations (profile creation, place insertion)

### Authentication Flow

1. Middleware (`src/middleware.ts`) handles session refresh and redirects
   - Unauthenticated users redirect to `/welcome` (landing page)
   - Authenticated users accessing auth pages redirect to `/places`
2. Welcome page (`/welcome`) - Entry point with three options:
   - "Continue with Apple" - Shows "Coming soon" alert (UI only, no OAuth logic)
   - "Continue with Google" - Shows "Coming soon" alert (UI only, no OAuth logic)
   - "Sign up with email" - Navigates to `/signup`
3. Server actions in `src/app/(auth)/actions.ts` handle login/signup/OAuth
4. Profile creation uses service client to bypass RLS on new user signup
5. `useAuth` hook manages client-side auth state and auto-creates profiles if missing

### Authentication UI Design

All auth pages use consistent color scheme:
- Background color: `#6867B0` (purple/indigo)
- Button color: `cyan-400` (teal)
- White text on colored backgrounds
- Enhanced Input component with icon support (`Mail`, `AtSign`, `Lock` from lucide-react)
- Full-screen layouts (no cards), mobile-first responsive design

### State Management

**Zustand Stores** (`src/stores/`):
- Lightweight state management for global app state
- Used for user preferences, UI state, and cached data

**React Hooks** (`src/hooks/`):
- `useAuth` - Manages authentication state and profile data
- `useMessages` - Sets up Realtime subscriptions and message history
- Feature-specific hooks for data fetching and mutations

**Server State**:
- API routes fetch fresh data from Supabase on each request
- Client components use hooks to subscribe to real-time updates
- No complex client-side cache (relies on Supabase Realtime for freshness)

### Real-time Messaging Architecture

**Place Messages** (`useMessages` hook):
1. Initial fetch via API route (`/api/messages/[placeId]`)
2. Set up Supabase Realtime subscription to `messages` table
3. Filter by `place_id` and listen for `INSERT`, `UPDATE`, `DELETE`
4. Automatically update UI when new messages arrive
5. Unsubscribe on component unmount

**Direct Messages**:
- Similar pattern with `dm_messages` table
- Filtered by `thread_id`
- Both users in conversation receive updates via Realtime

**Key Configuration**:
- Realtime enabled on `messages`, `dm_messages`, and `groups` tables
- Postgres triggers handle message counters and read status
- RLS ensures users only receive messages they're allowed to see

### Database Schema Architecture

**Core Tables**:
- `profiles` - User profiles (1:1 with auth.users)
- `places` - Cached Google Places data
- `place_members` - Many-to-many relationship (users ↔ places)
- `messages` - Place chat messages
- `friendships` - Friend relationships (pending/accepted)
- `dm_threads` - DM conversation containers
- `dm_messages` - Direct messages
- `groups` - Group chat feature

**Relationships**:
```
User (auth.users)
  ├─ 1:1 → Profile
  ├─ 1:N → PlaceMember
  ├─ 1:N → Message (sender)
  ├─ 1:N → Friendship (requester/addressee)
  └─ 1:N → DMMessage (sender)

Place
  ├─ 1:N → PlaceMember
  └─ 1:N → Message

Friendship
  └─ 1:1 → DMThread (when accepted)
```

**Type Definitions**:
- Manual type definitions in `src/types/database.ts`
- Must be kept synchronized with schema changes
- Core entities: Profile, Place, PlaceMember, Message, Friendship, DMThread, DMMessage

## UI Components

### Enhanced Input Component (`src/components/ui/Input.tsx`)

- Supports optional `icon` prop for prefix icons
- Styled with white background, shadow, and large padding
- Rounded corners (`rounded-xl`)
- Icon positioned absolutely with proper spacing

### Button Component (`src/components/ui/Button.tsx`)

- Variants: primary, secondary, ghost
- Sizes: sm, md, lg
- Loading state support

### Places Map Components (`src/components/places/`)

**MapContainer.tsx:**
- Wrapper component with Next.js dynamic import (ssr: false)
- Leaflet requires browser window object, so SSR is disabled
- Shows loading skeleton while map initializes
- Props: places, center, zoom, selectedPlace, onMarkerClick

**MapView.tsx:**
- Actual Leaflet MapContainer with OpenStreetMap TileLayer
- RecenterMap component handles smooth map recentering (flyTo animation)
- Renders markers for each place with coordinates
- Selected place gets larger marker icon
- Click marker to trigger place selection

**FloatingOverlay.tsx:**
- Glassmorphic overlay (bg-white/90 backdrop-blur-lg)
- Positioned absolutely over map (top-6 left-6)
- Switches between SearchView and DetailsView based on mode
- Smooth transitions with CSS

**SearchView.tsx:**
- Search input with purple icon (#6867B0)
- Scrollable results list with hover effects
- Loading and empty states
- Click result to show place details

**DetailsView.tsx:**
- Shows place photo, name, address, stats
- Back button returns to search
- "Join Place" button calls API and redirects to chat
- Loading states and error handling

**PlaceCard.tsx:**
- Reusable card for mobile grid view
- Click to join place directly
- Shows loading state during API call

### API Design Patterns

**RESTful Routes**:
- GET requests fetch data (with RLS applied)
- POST requests create resources
- PATCH/PUT requests update resources
- DELETE requests remove resources

**Authentication**:
- All API routes use `createClient()` from `server.ts`
- User ID extracted from session: `const { data: { user } } = await supabase.auth.getUser()`
- Unauthorized requests return 401

**Error Handling**:
- Try-catch blocks wrap all operations
- Return JSON with error messages: `{ error: "message" }`
- HTTP status codes indicate success/failure

**Data Validation**:
- Request body parsing via `await request.json()`
- Type checking and validation before database operations
- RLS provides additional security layer

### Component Architecture

**Layout Hierarchy**:
```
RootLayout (src/app/layout.tsx)
├── AuthLayout (src/app/(auth)/layout.tsx)
│   └── Welcome/Login/Signup pages
└── MainLayout (src/app/(main)/layout.tsx)
    ├── Sidebar (desktop)
    ├── MobileNav (mobile bottom nav)
    └── Page content
```

**Shared Components** (`src/components/ui/`):
- Reusable, generic components (Button, Input, etc.)
- Accept props for customization
- Styled with Tailwind CSS utility classes

**Feature Components**:
- Specific to features (MessageBubble, PlaceCard, FriendRequest, etc.)
- Composed from shared UI components
- Handle business logic and data fetching

**Places Page Architecture** (`src/app/(main)/places/page.tsx`):
- **Desktop (md: breakpoint)**: Interactive Leaflet map with floating overlay
  - Map fills viewport height, displays markers for all places
  - Floating overlay shows search or place details
  - Geolocation centers map on user's location (fallback to San Francisco)
  - Map recenters when place is selected
- **Mobile (<md)**: Grid layout with PlaceCard components
  - Traditional search and grid view
  - No map on mobile for better usability
- **State Management**: Local useState for selectedPlace, overlayMode, mapCenter
- **Direct Join Flow**: Clicking place calls `/api/places/[id]/join` then redirects to chat

## Key Patterns

### Google Places Caching

Places from Google API are cached in `places` table with 7-day expiry. Search flow: check cache first, then Google API, fallback to popular places on failure.

### RLS (Row Level Security)

All tables have RLS enabled. Key policies:
- Profiles are publicly viewable, users can only update their own
- Messages viewable/sendable only by place members
- DMs require mutual friendship
- Place insertions use service role (server-side only)

### Image Compression

Client-side compression via `src/lib/image-compression.ts` before upload. Max 500KB, 1920px max dimension. Thumbnails generated at 50KB/300px.

### Leaflet Map Integration

**Setup Requirements:**
- Packages: `leaflet`, `react-leaflet`, `@types/leaflet`
- Leaflet CSS imported in `src/app/globals.css`
- Marker assets in `public/leaflet/` (marker-icon.png, marker-icon-2x.png, marker-shadow.png)

**SSR Handling:**
- Leaflet requires browser window object
- Use Next.js dynamic import with `ssr: false` in MapContainer component
- Show loading skeleton during map initialization

**Icon Configuration:**
- Fix default marker icon paths (Webpack bundling breaks default paths)
- Delete default `_getIconUrl` and merge custom options pointing to public folder
- Custom selected marker icon with larger size (30x48)

**Map Features:**
- OpenStreetMap tiles (free, no API key required)
- Smooth recentering with `map.flyTo()` animation
- Zoom level 15 for place details, 13 for general view
- Geolocation API for user location with fallback

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_PLACES_API_KEY
NEXT_PUBLIC_APP_URL
```

## Database Schema

Full schema in `supabase-schema.sql`. Key tables: profiles, places, place_members, messages, friendships, dm_threads, dm_messages.
