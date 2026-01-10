"use server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Constants
const USERNAME_ID_LENGTH = 8;
const MIN_USERNAME_LENGTH = 3;
const MIN_PASSWORD_LENGTH = 6;

export async function login(formData: FormData) {
  // Input validation
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };

  // Ensure profile exists after login
  if (data.user) {
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    if (!existingProfile) {
      const serviceClient = createServiceClient();
      const username = data.user.user_metadata?.username || `user_${data.user.id.slice(0, USERNAME_ID_LENGTH)}`;
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
  }

  redirect("/places");
}

export async function signup(formData: FormData) {
  // Input validation
  const email = formData.get("email");
  const password = formData.get("password");
  const username = formData.get("username");

  if (!email || typeof email !== "string") {
    return { error: "Email is required." };
  }

  if (!password || typeof password !== "string") {
    return { error: "Password is required." };
  }

  if (!username || typeof username !== "string") {
    return { error: "Username is required." };
  }

  // Server-side length validation
  if (username.length < MIN_USERNAME_LENGTH) {
    return { error: `Username must be at least ${MIN_USERNAME_LENGTH} characters.` };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const supabase = await createClient();

  // Use the correct app URL for email confirmation redirect
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    // Provide user-friendly error messages
    if (error.message.includes("already registered") || error.message.includes("User already registered")) {
      return { error: "This email is already registered. Please log in instead." };
    }
    return { error: error.message };
  }

  // Check if signup actually created a user (email confirmation may be enabled)
  if (!data.user) {
    return { error: "Signup failed. Please try again." };
  }

  // Explicitly create profile using service client (bypasses RLS)
  // Handle unique constraint violation instead of pre-checking (fixes TOCTOU race condition)
  const serviceClient = createServiceClient();
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

    // If profile creation fails for other reasons, still proceed
    // The user is created in auth, profile will be created on login if missing
    return { error: "Account created but profile setup failed. Please try logging in." };
  }

  redirect("/places");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

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
