"use client";

import { useEffect, useState } from "react";
import { MapPin, Camera, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileStats as ProfileStatsType } from "@/types/database";

interface ProfileStatsProps {
  stats: ProfileStatsType;
  className?: string;
}

interface StatCardProps {
  icon: React.ElementType;
  value: number;
  label: string;
  delay?: number;
}

function StatCard({ icon: Icon, value, label, delay = 0 }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const timer = setTimeout(() => {
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(counter);
          setHasAnimated(true);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(counter);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay, hasAnimated]);

  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-2">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-2xl md:text-3xl font-bold font-['Outfit'] gradient-brand-text">
        {displayValue}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function ProfileStats({ stats, className }: ProfileStatsProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-3 md:gap-4 px-4 md:px-6 py-4", className)}>
      <StatCard
        icon={MapPin}
        value={stats.places_count}
        label="Places"
        delay={0}
      />
      <StatCard
        icon={Camera}
        value={stats.photos_count}
        label="Photos"
        delay={100}
      />
      <StatCard
        icon={Users}
        value={stats.friends_count}
        label="Friends"
        delay={200}
      />
    </div>
  );
}
