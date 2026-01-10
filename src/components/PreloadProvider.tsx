"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useAppStore } from "@/stores/appStore";
import { useIsPreloading, usePreloadError } from "@/stores/selectors";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface PreloadProviderProps {
  children: ReactNode;
}

export function PreloadProvider({ children }: PreloadProviderProps) {
  const preloadAll = useAppStore((state) => state.preloadAll);
  const isPreloading = useIsPreloading();
  const preloadError = usePreloadError();
  const hasStartedPreload = useRef(false);

  // Set up Realtime sync (only activates after preload completes)
  useRealtimeSync();

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
