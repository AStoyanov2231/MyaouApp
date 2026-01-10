"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { useAppStore } from "@/stores/appStore";

// Get the singleton client
const supabase = createClient();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track current user ID to avoid unnecessary refetches
  const currentUserIdRef = useRef<string | null>(null);

  const fetchOrCreateProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (existingProfile) {
        return existingProfile;
      }

      // Profile doesn't exist (PGRST116 = not found), create it
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
          const { data: retryProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();
          return retryProfile;
        }

        return newProfile;
      }

      console.error("Error fetching profile:", fetchError);
      return null;
    } catch (error) {
      console.error("Error in fetchOrCreateProfile:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Use getSession() instead of getUser() - reads from local storage without network request
        // Middleware already validated the session, so we can trust it
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        const authUser = session?.user ?? null;
        setUser(authUser);

        if (authUser) {
          currentUserIdRef.current = authUser.id;
          const fetchedProfile = await fetchOrCreateProfile(authUser);
          if (isMounted) {
            setProfile(fetchedProfile);
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        const authUser = session?.user ?? null;

        // Always update the user state
        setUser(authUser);

        if (authUser) {
          // Only fetch profile if user actually changed (not just token refresh)
          if (currentUserIdRef.current !== authUser.id) {
            currentUserIdRef.current = authUser.id;
            const fetchedProfile = await fetchOrCreateProfile(authUser);
            if (isMounted) {
              setProfile(fetchedProfile);
            }
          }
        } else {
          // User signed out - clear store and local state
          currentUserIdRef.current = null;
          setProfile(null);
          useAppStore.getState().clearStore();
        }

        // Ensure loading is false after any auth event
        if (isMounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile]);

  return { user, profile, loading };
}
