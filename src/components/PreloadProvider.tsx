"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useAppStore } from "@/stores/appStore";
import { useIsPreloading, usePreloadError, useProfile } from "@/stores/selectors";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { usePresence } from "@/hooks/usePresence";

interface PreloadProviderProps {
  children: ReactNode;
}

export function PreloadProvider({ children }: PreloadProviderProps) {
  const preloadAll = useAppStore((state) => state.preloadAll);
  const isPreloading = useIsPreloading();
  const preloadError = usePreloadError();
  const profile = useProfile();
  const hasStartedPreload = useRef(false);

  // Set up Realtime sync (only activates after preload completes)
  useRealtimeSync();

  // Set up Presence tracking for online status
  usePresence(profile?.id);

  useEffect(() => {
    // Only trigger preload once
    if (!hasStartedPreload.current) {
      hasStartedPreload.current = true;
      preloadAll();
    }
  }, [preloadAll]);

  // SplashScreen handles its own visibility based on isPreloading/preloadError
  return <>{children}</>;
}
