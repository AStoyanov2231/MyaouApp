"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchOrCreateProfile = async (authUser: User): Promise<Profile | null> => {
    // Try to fetch existing profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (existingProfile) {
      return existingProfile;
    }

    // Profile doesn't exist, create it
    const username = authUser.user_metadata?.username || `user_${authUser.id.slice(0, 8)}`;
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        username,
        display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
        avatar_url: authUser.user_metadata?.avatar_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create profile:", error);
      return null;
    }

    return newProfile;
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const profile = await fetchOrCreateProfile(user);
        setProfile(profile);
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user);
        setProfile(profile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading, supabase };
}
