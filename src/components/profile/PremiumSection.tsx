"use client";

import { useState } from "react";
import { Crown, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumBadge } from "@/components/ui/premium-badge";

interface PremiumSectionProps {
  isPremium: boolean;
  premiumUntil: string | null;
}

export function PremiumSection({
  isPremium,
  premiumUntil,
}: PremiumSectionProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to open customer portal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPremium) {
    return (
      <div className="px-4 md:px-6 py-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PremiumBadge size="md" showText />
            {premiumUntil && (
              <span className="text-sm text-muted-foreground">
                until {new Date(premiumUntil).toLocaleDateString()}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageSubscription}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-4 border-t">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              Upgrade to Premium
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unlock exclusive features including private photo access and more!
            </p>
            <Button
              className="mt-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white"
              onClick={handleUpgrade}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
