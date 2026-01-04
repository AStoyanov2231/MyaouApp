"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const initializedRef = useRef(false);

  // Create stable supabase client
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const fetchOrCreateProfile = async (authUser: User): Promise<Profile | null> => {
      try {
        // Try to fetch existing profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (existingProfile) {
          return existingProfile;
        }

        // Profile doesn't exist, create it
        if (fetchError?.code === "PGRST116") {
          const username = authUser.user_metadata?.username || `user_${authUser.id.slice(0, 8)}`;
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: authUser.id,
              username,
              display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
              avatar_url: authUser.user_metadata?.avatar_url || null,
            })
            .select()
            .single();

          if (insertError) {
            console.error("Failed to create profile:", insertError);
            // Try fetching again in case of race condition
            const { data: retryProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", authUser.id)
              .single();
            return retryProfile;
          }

          return newProfile;
        }

        return null;
      } catch (error) {
        console.error("Error in fetchOrCreateProfile:", error);
        return null;
      }
    };

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;

        setUser(user);
        if (user) {
          setProfileLoading(true);
          const fetchedProfile = await fetchOrCreateProfile(user);
          if (isMounted) {
            setProfile(fetchedProfile);
            setProfileLoading(false);
          }
        }
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        setProfileLoading(true);
        const fetchedProfile = await fetchOrCreateProfile(session.user);
        if (isMounted) {
          setProfile(fetchedProfile);
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return { user, profile, loading, profileLoading, supabase };
}
