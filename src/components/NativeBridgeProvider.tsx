"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";

// Only allow navigation to these known routes
const ALLOWED_ROUTES = ["/places", "/messages", "/friends", "/profile"];

/**
 * Provider that sets up the native bridge for iOS/Android WebView apps.
 * Registers window.navigateFromNative so native tab bar can control navigation.
 */
export function NativeBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;

    // Register navigation handler for native tab bar
    window.navigateFromNative = (route: string) => {
      // Only allow known routes or paths under them
      const isAllowed = ALLOWED_ROUTES.some(
        (allowed) => route === allowed || route.startsWith(allowed + "/")
      );

      if (isAllowed) {
        router.push(route);
      }
    };

    return () => {
      delete window.navigateFromNative;
    };
  }, [router]);

  return <>{children}</>;
}
