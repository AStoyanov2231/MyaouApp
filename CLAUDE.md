# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PlaceChat is a location-based chat application where users discover real-world places (via Google Places API) and join place-specific chat rooms. Features include real-time messaging, friend system with mutual opt-in DMs, and media sharing.

## Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
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

### Route Structure

- `src/app/(auth)/` - Authentication pages (login, signup) with server actions
- `src/app/(main)/` - Protected app routes with shared layout (Sidebar + MobileNav)
- `src/app/api/` - API routes for places, messages, friends, DMs, profile, upload

### Supabase Clients

Two client patterns exist in `src/lib/supabase/`:
- `client.ts` - Browser client (singleton pattern for consistent session)
- `server.ts` - Server client with `createClient()` for user context and `createServiceClient()` for service role (bypasses RLS)

### Authentication Flow

1. Middleware (`src/middleware.ts`) handles session refresh and redirects
2. Server actions in `src/app/(auth)/actions.ts` handle login/signup/OAuth
3. Profile creation uses service client to bypass RLS on new user signup
4. `useAuth` hook manages client-side auth state and auto-creates profiles if missing

### Real-time Messaging

`useMessages` hook (`src/hooks/useMessages.ts`) sets up Supabase Realtime subscriptions per place. Messages are fetched via API then updated via postgres_changes events.

### Database Types

Manual type definitions in `src/types/database.ts` - keep synchronized with schema changes. Core entities: Profile, Place, PlaceMember, Message, Friendship, DMThread, DMMessage.

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
