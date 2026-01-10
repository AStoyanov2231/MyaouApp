# Authentication Code Review - Issues to Fix

This document contains security and logic issues found in the login/signup authentication flow that need to be addressed.

## Critical Issues (High Severity)

### 1. Input Validation Missing in Server Actions

**Files:** `src/app/(auth)/actions.ts`
**Lines:** 8-9, 38-40

**Problem:** Form data is cast to string without null/type validation. If fields are missing, `null` is passed to Supabase.

**Current Code:**
```typescript
// login function (lines 8-9)
email: formData.get("email") as string,
password: formData.get("password") as string,

// signup function (lines 38-40)
const email = formData.get("email") as string;
const password = formData.get("password") as string;
const username = formData.get("username") as string;
```

**Fix Required:**
```typescript
// Add validation at the start of both login() and signup() functions
const email = formData.get("email");
const password = formData.get("password");

if (!email || !password || typeof email !== "string" || typeof password !== "string") {
  return { error: "Email and password are required." };
}

// For signup, also validate username
const username = formData.get("username");
if (!username || typeof username !== "string" || username.length < 3) {
  return { error: "Username must be at least 3 characters." };
}
```

---

### 2. Race Condition in Username Uniqueness Check (TOCTOU)

**File:** `src/app/(auth)/actions.ts`
**Lines:** 43-51, 79-85

**Problem:** The username uniqueness check and profile insert are two separate operations. Between the check and insert, another user could claim the same username. This is a Time-of-Check to Time-of-Use (TOCTOU) vulnerability.

**Current Code:**
```typescript
// Check username (lines 43-47)
const { data: existingUsername } = await supabase
  .from("profiles")
  .select("id")
  .eq("username", username)
  .single();

if (existingUsername) {
  return { error: "Username is already taken. Please choose another one." };
}

// ... later, insert profile (lines 79-85)
const { error: profileError } = await serviceClient.from("profiles").insert({
  id: data.user.id,
  username,
  // ...
});
```

**Fix Required:**
Remove the pre-check and handle the unique constraint violation from the insert instead:

```typescript
// Remove lines 42-51 (the username pre-check)

// Modify the profile insert to handle unique violation (lines 79-92)
const { error: profileError } = await serviceClient.from("profiles").insert({
  id: data.user.id,
  username,
  display_name: null,
  avatar_url: null,
});

if (profileError) {
  console.error("Failed to create profile:", profileError);

  // Check if it's a unique constraint violation on username
  if (profileError.code === "23505" && profileError.message?.includes("username")) {
    return { error: "Username is already taken. Please choose another one." };
  }

  return { error: "Account created but profile setup failed. Please try logging in." };
}
```

**Note:** Ensure the `profiles` table has a unique constraint on the `username` column in Supabase.

---

### 3. OAuth Users Don't Get Profile Created

**File:** `src/app/auth/callback/route.ts`
**Lines:** 19-32

**Problem:** When a user signs in via OAuth (Google), the callback only exchanges the code for a session. Unlike email signup, no profile is created. This will cause errors when the app expects a profile row.

**Current Code:**
```typescript
if (code) {
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // ... error handling
  }
}

// Redirect to the intended destination
return NextResponse.redirect(`${origin}${next}`);
```

**Fix Required:**
```typescript
import { createClient, createServiceClient } from "@/lib/supabase/server";

// ... existing code ...

if (code) {
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Code exchange error:", exchangeError);
    const redirectUrl = new URL("/login", origin);
    redirectUrl.searchParams.set("error", "Failed to authenticate. Please try again.");
    return NextResponse.redirect(redirectUrl);
  }

  // Create profile for OAuth users if it doesn't exist
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      const serviceClient = createServiceClient();
      const username = user.user_metadata?.preferred_username ||
                       user.user_metadata?.user_name ||
                       `user_${user.id.slice(0, 8)}`;

      await serviceClient.from("profiles").insert({
        id: user.id,
        username,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    }
  }
}
```

---

## Medium Severity Issues

### 4. Profile Creation Error Not Handled in Login

**File:** `src/app/(auth)/actions.ts`
**Lines:** 22-30

**Problem:** During login, if a profile doesn't exist (edge case), it's created but errors are not handled. A failed insert silently continues.

**Current Code:**
```typescript
if (!existingProfile) {
  const serviceClient = createServiceClient();
  const username = data.user.user_metadata?.username || `user_${data.user.id.slice(0, 8)}`;
  await serviceClient.from("profiles").insert({
    id: data.user.id,
    username,
    display_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
    avatar_url: data.user.user_metadata?.avatar_url || null,
  });
}
```

**Fix Required:**
```typescript
if (!existingProfile) {
  const serviceClient = createServiceClient();
  const username = data.user.user_metadata?.username || `user_${data.user.id.slice(0, 8)}`;
  const { error: profileError } = await serviceClient.from("profiles").insert({
    id: data.user.id,
    username,
    display_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
    avatar_url: data.user.user_metadata?.avatar_url || null,
  });

  if (profileError) {
    console.error("Failed to create profile during login:", profileError);
    // Continue anyway - profile creation will be retried on next login
  }
}
```

---

### 5. signInWithGoogle Returns Undefined

**File:** `src/app/(auth)/actions.ts`
**Lines:** 103-111

**Problem:** If `data.url` is undefined but there's no error, the function implicitly returns `undefined`, leaving the client in an ambiguous state.

**Current Code:**
```typescript
export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  // Implicitly returns undefined
}
```

**Fix Required:**
```typescript
export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: "Failed to initiate Google sign-in. Please try again." };
}
```

---

### 6. Empty Catch Block in Supabase Server Client

**File:** `src/lib/supabase/server.ts`
**Line:** 20

**Problem:** Cookie setting errors are silently swallowed, making debugging difficult.

**Current Code:**
```typescript
setAll: (cookiesToSet: CookieToSet[]) => {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  } catch {}
},
```

**Fix Required:**
```typescript
setAll: (cookiesToSet: CookieToSet[]) => {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  } catch (error) {
    // Cookie setting can fail in certain contexts (e.g., after response sent)
    // This is expected behavior in some cases, but log for debugging
    console.debug("Cookie set warning:", error);
  }
},
```

---

## Low Severity Issues

### 7. Server-Side Validation Doesn't Match Client Constraints

**Files:** `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/actions.ts`

**Problem:** Client has `minLength={3}` for username and `minLength={6}` for password, but server doesn't validate these constraints.

**Fix Required:** Add to `signup()` function in actions.ts:
```typescript
if (username.length < 3) {
  return { error: "Username must be at least 3 characters." };
}

if (password.length < 6) {
  return { error: "Password must be at least 6 characters." };
}
```

---

### 8. Magic Number for Generated Username

**File:** `src/app/(auth)/actions.ts`
**Lines:** 23, and similar in callback

**Problem:** The number `8` for username slice is a magic number used in multiple places.

**Fix Required:** Create a constant:
```typescript
const USERNAME_ID_LENGTH = 8;

// Usage
const username = `user_${data.user.id.slice(0, USERNAME_ID_LENGTH)}`;
```

---

## Summary Checklist

- [ ] Add input validation to `login()` function
- [ ] Add input validation to `signup()` function
- [ ] Fix TOCTOU race condition in username check (remove pre-check, handle constraint violation)
- [ ] Add profile creation for OAuth users in `/auth/callback/route.ts`
- [ ] Add error handling for profile creation in `login()` function
- [ ] Fix `signInWithGoogle()` to return error when URL is missing
- [ ] Add logging to empty catch block in `server.ts`
- [ ] Add server-side length validation for username and password
- [ ] Extract magic number `8` to a constant

## Database Requirements

Ensure the `profiles` table has:
- A unique constraint on `username` column (required for fix #2)
