# Implementation Plan - PlaceChat Premium Features

This document contains a comprehensive implementation plan for two major features:
1. **Stripe Payment Processing** - Premium subscription with Google Pay/Apple Pay
2. **User Gallery Modification** - Public/Private photo visibility system

---

## Feature 1: Stripe Payment Processing

### Overview
Implement a premium subscription system using Stripe Checkout with support for Google Pay and Apple Pay. After successful payment, users gain premium status with visual indicators throughout the app.

### Database Changes Required

#### Migration 1: Add Premium Fields to Profiles Table
```sql
-- Add premium subscription fields to profiles table
ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN premium_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN stripe_subscription_id TEXT;
```

#### Migration 2: Create Subscriptions Table for History
```sql
-- Create subscriptions table to track payment history
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, incomplete
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscriptions
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

---

### Task 1.1: Database Schema Setup for Premium
**Objective**: Create the necessary database schema to support premium subscriptions

**Steps**:
1. Apply migration to add premium fields to profiles table
2. Apply migration to create subscriptions table
3. Update TypeScript types in `src/types/database.ts`

**Expected Result**: Database has `is_premium`, `premium_until`, `stripe_customer_id`, `stripe_subscription_id` columns in profiles table, and a new `subscriptions` table exists.

**Files to Modify**:
- `src/types/database.ts` - Add new types

**New Types to Add**:
```typescript
// Add to Profile type:
// is_premium: boolean;
// premium_until: string | null;
// stripe_customer_id: string | null;
// stripe_subscription_id: string | null;

// New Subscription type:
export type Subscription = {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};
```

---

### Task 1.2: Install Stripe Dependencies and Configure Environment
**Objective**: Set up Stripe SDK and environment variables

**Steps**:
1. Install Stripe npm package: `npm install stripe @stripe/stripe-js`
2. Create Stripe configuration file at `src/lib/stripe.ts`
3. Document required environment variables

**Expected Result**: Stripe SDK is installed and configuration is ready.

**Files to Create**:
- `src/lib/stripe.ts` - Server-side Stripe client

**Environment Variables Required** (add to `.env.local`):
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_... # The price ID for premium subscription
```

**Code for `src/lib/stripe.ts`**:
```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});
```

---

### Task 1.3: Create Checkout Session API Route
**Objective**: Create an API endpoint to initiate Stripe Checkout

**Steps**:
1. Create `/api/stripe/checkout/route.ts`
2. Implement POST handler that creates a Stripe Checkout session
3. Configure for subscription mode with Google Pay/Apple Pay enabled
4. Return session URL for redirect

**Expected Result**: API endpoint that creates a checkout session and returns the URL.

**File to Create**: `src/app/api/stripe/checkout/route.ts`

**Implementation**:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, username, is_premium")
    .eq("id", user.id)
    .single();

  if (profile?.is_premium) {
    return NextResponse.json({ error: "Already premium" }, { status: 400 });
  }

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    // Save customer ID to profile
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: process.env.STRIPE_PREMIUM_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?payment=canceled`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    payment_method_options: {
      card: {
        request_three_d_secure: "automatic",
      },
    },
    // Enable wallet payment methods (Google Pay, Apple Pay)
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
```

---

### Task 1.4: Create Stripe Webhook Handler
**Objective**: Handle Stripe webhook events to update user premium status

**Steps**:
1. Create `/api/stripe/webhook/route.ts`
2. Implement signature verification for security
3. Handle key events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Update user's premium status in database based on events

**Expected Result**: Webhook endpoint that processes Stripe events and updates premium status.

**File to Create**: `src/app/api/stripe/webhook/route.ts`

**Implementation**:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.subscription
        ? (await stripe.subscriptions.retrieve(session.subscription as string))
            .metadata.supabase_user_id
        : session.metadata?.supabase_user_id;

      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await supabase
          .from("profiles")
          .update({
            is_premium: true,
            premium_until: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            stripe_subscription_id: subscription.id,
          })
          .eq("id", userId);

        // Create subscription record
        await supabase.from("subscriptions").insert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.supabase_user_id;

      if (userId) {
        const isActive = subscription.status === "active";

        await supabase
          .from("profiles")
          .update({
            is_premium: isActive,
            premium_until: isActive
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("id", userId);

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.supabase_user_id;

      if (userId) {
        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            premium_until: null,
            stripe_subscription_id: null,
          })
          .eq("id", userId);

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

### Task 1.5: Create Customer Portal API Route
**Objective**: Allow premium users to manage their subscription

**Steps**:
1. Create `/api/stripe/portal/route.ts`
2. Generate Stripe Customer Portal session
3. Return portal URL for redirect

**Expected Result**: API endpoint that returns a Stripe Customer Portal URL.

**File to Create**: `src/app/api/stripe/portal/route.ts`

**Implementation**:
```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
  });

  return NextResponse.json({ url: session.url });
}
```

---

### Task 1.6: Create Premium Badge Component
**Objective**: Create a reusable visual indicator for premium users

**Steps**:
1. Create `src/components/ui/premium-badge.tsx`
2. Design badge with crown/star icon and gradient styling
3. Support different sizes for various contexts

**Expected Result**: A reusable PremiumBadge component.

**File to Create**: `src/components/ui/premium-badge.tsx`

**Implementation**:
```typescript
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function PremiumBadge({ size = "md", className, showText = false }: PremiumBadgeProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const containerClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium",
        containerClasses[size],
        className
      )}
    >
      <Crown className={sizeClasses[size]} />
      {showText && <span>Premium</span>}
    </div>
  );
}
```

---

### Task 1.7: Create Premium Subscription Section Component
**Objective**: Create a subscription management section for the profile page

**Steps**:
1. Create `src/components/profile/PremiumSection.tsx`
2. Show different states: not premium (upgrade button), premium (manage subscription)
3. Handle checkout and portal redirects
4. Show premium expiration date if subscribed

**Expected Result**: A profile section component for managing premium subscription.

**File to Create**: `src/components/profile/PremiumSection.tsx`

**Implementation**:
```typescript
"use client";

import { useState } from "react";
import { Crown, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";

interface PremiumSectionProps {
  isPremium: boolean;
  premiumUntil: string | null;
}

export function PremiumSection({ isPremium, premiumUntil }: PremiumSectionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to open customer portal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPremium) {
    return (
      <div className="px-4 md:px-6 py-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PremiumBadge size="md" showText />
            {premiumUntil && (
              <span className="text-sm text-muted-foreground">
                until {new Date(premiumUntil).toLocaleDateString()}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageSubscription}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-4 border-t">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Upgrade to Premium</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unlock exclusive features including private photo access and more!
            </p>
            <Button
              className="mt-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 1.8: Integrate Premium into Profile Page
**Objective**: Add premium status to profile page and show visual indicators

**Steps**:
1. Update profile page to fetch and pass premium status
2. Add PremiumSection component to ProfilePageClient
3. Add PremiumBadge next to username for premium users
4. Update ProfileHeader to show premium badge
5. Handle payment success/canceled URL params for toast notifications

**Expected Result**: Profile page shows premium status and upgrade/manage options.

**Files to Modify**:
- `src/app/(main)/profile/page.tsx` - Fetch premium status
- `src/components/profile/ProfilePageClient.tsx` - Add PremiumSection
- `src/components/profile/ProfileHeader.tsx` - Add PremiumBadge
- `src/types/database.ts` - Ensure Profile type has premium fields

---

### Task 1.9: Update Store with Premium Status
**Objective**: Add premium status to global state for access across app

**Steps**:
1. Update appStore to include isPremium state
2. Add selectors for premium status
3. Sync premium status from profile data

**Expected Result**: Premium status is available in global state.

**Files to Modify**:
- `src/stores/appStore.ts` - Add premium state
- `src/stores/selectors.ts` - Add premium selectors

---

### Task 1.10: Show Premium Badge Throughout App
**Objective**: Display premium badge on user avatars/names across the app

**Steps**:
1. Update friend list to show premium badge
2. Update message sender names to show premium badge
3. Update other user profile page to show premium badge

**Expected Result**: Premium users have visible badge throughout the application.

**Files to Modify**:
- `src/components/friends/FriendsTabsClient.tsx`
- `src/app/(main)/messages/[threadId]/page.tsx`
- `src/components/profile/OtherProfileClient.tsx`

---

## Feature 2: User Gallery Modification (Public/Private Photos)

### Overview
Allow users to mark their photos as public or private. Private photos are blurred for non-premium users when viewing other profiles. Photo owners can always see their own photos.

### Database Changes Required

#### Migration: Add Visibility Field to Profile Photos
```sql
-- Add visibility field to profile_photos
ALTER TABLE profile_photos ADD COLUMN is_private BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying
CREATE INDEX idx_profile_photos_visibility ON profile_photos(user_id, is_private);
```

---

### Task 2.1: Database Schema Update for Photo Visibility
**Objective**: Add visibility field to profile_photos table

**Steps**:
1. Apply migration to add `is_private` column to profile_photos
2. Update TypeScript ProfilePhoto type

**Expected Result**: profile_photos table has `is_private` column.

**Files to Modify**:
- `src/types/database.ts` - Update ProfilePhoto type

**Type Update**:
```typescript
export type ProfilePhoto = {
  id: string;
  user_id: string;
  storage_path: string;
  url: string;
  thumbnail_url: string | null;
  is_avatar: boolean;
  is_private: boolean; // NEW FIELD
  display_order: number;
  created_at: string;
};
```

---

### Task 2.2: Update Photo API Routes for Visibility
**Objective**: Allow setting photo visibility via API

**Steps**:
1. Update `PATCH /api/profile/photos/[photoId]` to accept `is_private` field
2. Ensure only photo owner can change visibility

**Expected Result**: API supports changing photo visibility.

**File to Modify**: `src/app/api/profile/photos/[photoId]/route.ts`

---

### Task 2.3: Update PhotoGallery for Owner View
**Objective**: Allow photo owners to toggle visibility and see private indicator

**Steps**:
1. Add visibility toggle option to photo menu
2. Show lock icon on private photos
3. Implement toggle handler

**Expected Result**: Photo owners can toggle visibility from gallery.

**File to Modify**: `src/components/profile/PhotoGallery.tsx`

**Changes**:
- Add `onTogglePrivate` callback prop
- Add lock icon overlay for private photos
- Add "Make Private" / "Make Public" menu option

---

### Task 2.4: Create BlurredPhoto Component
**Objective**: Create a component that shows blurred photos with unlock prompt

**Steps**:
1. Create `src/components/profile/BlurredPhoto.tsx`
2. Apply CSS blur filter
3. Show lock icon and upgrade prompt overlay
4. Support thumbnail and full-size modes

**Expected Result**: Reusable component for displaying blurred private photos.

**File to Create**: `src/components/profile/BlurredPhoto.tsx`

**Implementation**:
```typescript
"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlurredPhotoProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

export function BlurredPhoto({ src, alt = "", className, onClick }: BlurredPhotoProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden cursor-pointer group",
        className
      )}
      onClick={onClick}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover filter blur-xl scale-110"
      />
      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
        <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm mb-2">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <span className="text-white text-sm font-medium">Premium Only</span>
      </div>
    </div>
  );
}
```

---

### Task 2.5: Create Gallery View Component for Other Profiles
**Objective**: Create a gallery component that respects privacy for viewing other users

**Steps**:
1. Create `src/components/profile/OtherUserGallery.tsx`
2. Accept `viewerIsPremium` prop
3. Show blurred photos for non-premium viewers
4. Premium viewers see all photos normally

**Expected Result**: Gallery component that blurs private photos for non-premium viewers.

**File to Create**: `src/components/profile/OtherUserGallery.tsx`

**Implementation**:
```typescript
"use client";

import { useState } from "react";
import { Lock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BlurredPhoto } from "./BlurredPhoto";
import { cn } from "@/lib/utils";
import type { ProfilePhoto } from "@/types/database";

interface OtherUserGalleryProps {
  photos: ProfilePhoto[];
  viewerIsPremium: boolean;
  className?: string;
}

export function OtherUserGallery({
  photos,
  viewerIsPremium,
  className,
}: OtherUserGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const publicPhotos = photos.filter((p) => !p.is_private);
  const privatePhotos = photos.filter((p) => p.is_private);

  // If viewer is premium, they see all photos
  const visiblePhotos = viewerIsPremium ? photos : publicPhotos;

  const openViewer = (index: number) => {
    if (!viewerIsPremium && photos[index]?.is_private) {
      return; // Don't open viewer for private photos if not premium
    }
    setCurrentIndex(index);
    setViewerOpen(true);
  };

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % visiblePhotos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + visiblePhotos.length) % visiblePhotos.length);
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className={cn("px-4 md:px-6 py-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Photos ({photos.length})
          {!viewerIsPremium && privatePhotos.length > 0 && (
            <span className="ml-2 text-xs">
              <Lock className="inline h-3 w-3 mr-1" />
              {privatePhotos.length} private
            </span>
          )}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-1 md:gap-2">
        {photos.map((photo, index) => {
          const isPrivate = photo.is_private;
          const canView = viewerIsPremium || !isPrivate;

          if (!canView) {
            return (
              <BlurredPhoto
                key={photo.id}
                src={photo.thumbnail_url || photo.url}
                className="aspect-square rounded-lg"
              />
            );
          }

          return (
            <div
              key={photo.id}
              className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg"
              onClick={() => openViewer(viewerIsPremium ? index : publicPhotos.indexOf(photo))}
            >
              <img
                src={photo.thumbnail_url || photo.url}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {isPrivate && viewerIsPremium && (
                <div className="absolute top-1 right-1 p-1 rounded-full bg-black/50">
                  <Lock className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {visiblePhotos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="flex items-center justify-center min-h-[60vh] p-4">
            {visiblePhotos[currentIndex] && (
              <img
                src={visiblePhotos[currentIndex].url}
                alt=""
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {currentIndex + 1} / {visiblePhotos.length}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

### Task 2.6: Update Other User Profile Page
**Objective**: Integrate gallery visibility into other user profile view

**Steps**:
1. Fetch current viewer's premium status
2. Pass premium status to OtherUserGallery
3. Replace PhotoGallery with OtherUserGallery

**Expected Result**: Other user profiles show blurred private photos for non-premium viewers.

**Files to Modify**:
- `src/app/(main)/profile/[userId]/page.tsx` - Fetch viewer premium status
- `src/components/profile/OtherProfileClient.tsx` - Use OtherUserGallery

---

### Task 2.7: Update Own Profile PhotoGallery
**Objective**: Add privacy toggle to own photo gallery

**Steps**:
1. Add privacy toggle to photo context menu
2. Implement `handleTogglePrivate` in ProfilePageClient
3. Add API call to update photo visibility
4. Show lock icon on private photos in own gallery

**Expected Result**: Users can toggle photo visibility from their profile.

**Files to Modify**:
- `src/components/profile/PhotoGallery.tsx` - Add privacy toggle UI
- `src/components/profile/ProfilePageClient.tsx` - Add toggle handler

---

### Task 2.8: Update Photo Upload with Default Visibility
**Objective**: Allow setting visibility when uploading photos

**Steps**:
1. Update photo upload API to accept `is_private` parameter
2. Optionally add visibility toggle to upload flow

**Expected Result**: New photos can be uploaded with specified visibility.

**File to Modify**: `src/app/api/profile/photos/route.ts`

---

## Implementation Order

The tasks should be implemented in the following order:

### Phase 1: Database & Types (Tasks 1.1, 2.1)
1. Task 1.1 - Database schema for premium
2. Task 2.1 - Database schema for photo visibility
3. Update all TypeScript types

### Phase 2: Stripe Backend (Tasks 1.2-1.5)
4. Task 1.2 - Install Stripe and configure
5. Task 1.3 - Checkout session API
6. Task 1.4 - Webhook handler
7. Task 1.5 - Customer portal API

### Phase 3: Premium UI (Tasks 1.6-1.10)
8. Task 1.6 - Premium badge component
9. Task 1.7 - Premium section component
10. Task 1.8 - Profile page integration
11. Task 1.9 - Store updates
12. Task 1.10 - Premium badge throughout app

### Phase 4: Gallery Backend (Tasks 2.2)
13. Task 2.2 - Photo visibility API updates

### Phase 5: Gallery UI (Tasks 2.3-2.8)
14. Task 2.3 - Owner gallery updates
15. Task 2.4 - Blurred photo component
16. Task 2.5 - Other user gallery component
17. Task 2.6 - Other profile page updates
18. Task 2.7 - Own profile privacy toggle
19. Task 2.8 - Upload with visibility

---

## Testing Checklist

### Stripe Integration
- [ ] User can initiate checkout from profile
- [ ] Stripe Checkout opens with Google Pay/Apple Pay options
- [ ] Successful payment updates user to premium
- [ ] Premium badge appears after payment
- [ ] Webhook correctly processes subscription events
- [ ] Customer portal allows subscription management
- [ ] Subscription cancellation removes premium status

### Gallery Visibility
- [ ] User can toggle photo visibility
- [ ] Private indicator shows on private photos
- [ ] Non-premium users see blurred private photos on other profiles
- [ ] Premium users see all photos on other profiles
- [ ] Photo owner always sees their own photos
- [ ] Gallery viewer works correctly for both public and private photos

---

## Environment Variables Summary

Add these to `.env.local`:
```
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

---

## Notes for Implementation

1. **Stripe Setup**: Before implementing, create a Stripe account and:
   - Create a Product for "Premium Subscription"
   - Create a Price (recurring monthly or yearly)
   - Configure webhook endpoint in Stripe Dashboard
   - Enable Google Pay and Apple Pay in payment method settings

2. **Webhook Security**: Always verify webhook signatures in production

3. **RLS Policies**: Ensure Supabase RLS policies allow the service role to update premium status

4. **Testing**: Use Stripe test mode and test card numbers (4242 4242 4242 4242)

5. **Error Handling**: Add proper error handling and user feedback for payment failures
