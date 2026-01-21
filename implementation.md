# Web App Integration Guide

## Overview

Wire your Next.js app at `lybers.com` to communicate with the native iOS shell.

## 1. Detect Native Context

```typescript
// utils/native.ts
export const isNativeApp = typeof window !== 'undefined' && window.isNativeApp === true;
export const nativePlatform = typeof window !== 'undefined' ? window.nativePlatform : null;
```

Add type declarations:
```typescript
// types/global.d.ts
declare global {
  interface Window {
    isNativeApp?: boolean;
    nativePlatform?: 'ios' | 'android';
    navigateFromNative?: (route: string) => void;
    webkit?: {
      messageHandlers: {
        nativeBridge: {
          postMessage: (message: string) => void;
        };
      };
    };
  }
}
export {};
```

## 2. Send Messages to Native

```typescript
// utils/native.ts
export function postToNative(action: string, payload?: Record<string, unknown>) {
  if (!isNativeApp) return;

  const message = JSON.stringify({ action, payload });
  window.webkit?.messageHandlers.nativeBridge.postMessage(message);
}
```

## 3. Authentication State

Send auth state when user logs in/out:

```typescript
// After successful login
postToNative('authStateChanged', { isAuthenticated: true });

// After logout
postToNative('authStateChanged', { isAuthenticated: false });
```

On app load, check existing session and notify native:
```typescript
// In your auth provider or app initialization
useEffect(() => {
  if (isNativeApp && user) {
    postToNative('authStateChanged', { isAuthenticated: true });
  }
}, [user]);
```

## 4. Handle Native Tab Navigation

Register the navigation handler (e.g., in `_app.tsx` or root layout):

```typescript
// app/layout.tsx or pages/_app.tsx
import { useRouter } from 'next/navigation';

useEffect(() => {
  if (!isNativeApp) return;

  window.navigateFromNative = (route: string) => {
    router.push(route);
  };

  return () => {
    delete window.navigateFromNative;
  };
}, [router]);
```

## 5. Hide Web Navigation

Conditionally hide your web app's bottom nav when in native context:

```tsx
// components/BottomNav.tsx
import { isNativeApp } from '@/utils/native';

export function BottomNav() {
  if (isNativeApp) return null;

  return (
    <nav>{/* your navigation */}</nav>
  );
}
```

## 6. Badge Updates

Send unread counts to update native tab badges:

```typescript
// When unread message count changes
postToNative('updateBadge', { tab: 'messages', count: unreadCount });
```

## Message Reference

| Action | Payload | Description |
|--------|---------|-------------|
| `authStateChanged` | `{ isAuthenticated: boolean }` | Show/hide native tab bar |
| `updateBadge` | `{ tab: string, count: number }` | Update tab badge (messages) |

## Checklist

- [ ] Add type declarations for window properties
- [ ] Create `utils/native.ts` with helper functions
- [ ] Send `authStateChanged` on login/logout and app init
- [ ] Register `window.navigateFromNative` in root component
- [ ] Hide web bottom nav when `isNativeApp === true`
- [ ] Send badge updates when unread counts change
