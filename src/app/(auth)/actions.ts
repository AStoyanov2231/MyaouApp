"use server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
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
      const username = data.user.user_metadata?.username || `user_${data.user.id.slice(0, 8)}`;
      await serviceClient.from("profiles").insert({
        id: data.user.id,
        username,
        display_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
      });
    }
  }

  redirect("/places");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  // Check if username is already taken
  const { data: existingUsername } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUsername) {
    return { error: "Username is already taken. Please choose another one." };
  }

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
  const serviceClient = createServiceClient();
  const { error: profileError } = await serviceClient.from("profiles").insert({
    id: data.user.id,
    username,
    display_name: null,
    avatar_url: null,
  });

  if (profileError) {
    console.error("Failed to create profile:", profileError);
    // If profile creation fails, we should handle it but still proceed
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
}
