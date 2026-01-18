"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const NAVIGATION_TIMEOUT_MS = 3000;

/**
 * Hook for optimistic navigation state.
 * Makes navigation feel instant by updating active state immediately on click,
 * before the actual route change completes.
 */
export function useOptimisticNav() {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const prevPathnameRef = useRef(pathname);

  // Clear pending state when any navigation completes (pathname changes)
  // This handles rapid clicking - any completed navigation clears the pending state
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (pendingPath) {
        setPendingPath(null);
      }
    }
  }, [pathname, pendingPath]);

  // Also clear after a timeout in case navigation fails
  useEffect(() => {
    if (!pendingPath) return;

    const timeout = setTimeout(() => {
      setPendingPath(null);
    }, NAVIGATION_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [pendingPath]);

  const setOptimisticPath = useCallback((path: string) => {
    setPendingPath(path);
  }, []);

  // The path to use for active state calculation
  const activePath = useMemo(() => {
    return pendingPath ?? pathname;
  }, [pendingPath, pathname]);

  return {
    pathname,    // Real pathname for visibility/logic checks
    activePath,  // Optimistic path for active state UI
    isPending: pendingPath !== null,
    setOptimisticPath,
  };
}
