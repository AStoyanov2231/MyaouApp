"use client";
import { useIsPreloading, usePreloadError } from "@/stores/selectors";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw } from "lucide-react";

export function SplashScreen() {
  const isPreloading = useIsPreloading();
  const preloadError = usePreloadError();
  const preloadAll = useAppStore((state) => state.preloadAll);

  // Don't render if not preloading and no error
  if (!isPreloading && !preloadError) {
    return null;
  }

  const handleRetry = () => {
    preloadAll();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Logo/Icon */}
        <div className="relative">
          <div
            className={`w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center ${
              !preloadError ? "animate-pulse" : ""
            }`}
          >
            <MapPin className="h-10 w-10 text-primary" />
          </div>
        </div>

        {/* App name */}
        <h1 className="text-2xl font-bold text-primary">PlaceChat</h1>

        {/* Status message */}
        {preloadError ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-destructive text-center max-w-xs">{preloadError}</p>
            <Button onClick={handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <p className="text-muted-foreground text-sm">Loading your data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
