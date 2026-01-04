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
      const serviceClient = await createServiceClient();
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) return { error: error.message };

  // Explicitly create profile using service client (bypasses RLS)
  if (data.user) {
    const serviceClient = await createServiceClient();
    const { error: profileError } = await serviceClient.from("profiles").insert({
      id: data.user.id,
      username,
      display_name: null,
      avatar_url: null,
    });

    if (profileError) {
      console.error("Failed to create profile:", profileError);
    }
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
