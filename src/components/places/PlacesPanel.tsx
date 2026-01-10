"use client";

import { useEffect, useState } from "react";
import { Place } from "@/types/database";
import { PlacePanelCard } from "./PlacePanelCard";
import { History, TrendingUp, Loader2 } from "lucide-react";

type PlaceWithVisitedAt = Place & { visited_at?: string };

export function PlacesPanel() {
  const [recentPlaces, setRecentPlaces] = useState<PlaceWithVisitedAt[]>([]);
  const [popularPlaces, setPopularPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [historyRes, popularRes] = await Promise.all([
          fetch("/api/places/history"),
          fetch("/api/places/popular"),
        ]);

        const [historyData, popularData] = await Promise.all([
          historyRes.ok ? historyRes.json() : { places: [] },
          popularRes.ok ? popularRes.json() : { places: [] },
        ]);

        setRecentPlaces(historyData.places || []);
        setPopularPlaces((popularData.places || []).slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch places panel data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Don't render if no data and not loading
  if (!loading && recentPlaces.length === 0 && popularPlaces.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-6 right-6 z-50 w-[320px] max-w-[calc(100%-3rem)]">
      <div className="relative p-[2px] rounded-3xl gradient-brand-border shadow-2xl shadow-primary/20 animate-[fadeIn_0.4s_ease-out]">
        <div className="bg-card rounded-3xl overflow-hidden backdrop-blur-xl">
          <div className="relative overflow-hidden">
            {/* Decorative gradient orbs */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]" />
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite_reverse]" />

            {/* Content */}
            <div className="relative z-10 p-5 space-y-5 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Recent Places Section */}
                  {recentPlaces.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full gradient-brand-subtle flex items-center justify-center">
                          <History className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Recent Places
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {recentPlaces.map((place, index) => (
                          <PlacePanelCard
                            key={place.id}
                            place={place}
                            index={index}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Popular Now Section */}
                  {popularPlaces.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center">
                          <TrendingUp className="h-4 w-4 text-accent" />
                        </div>
                        <h3 className="font-semibold text-sm text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Popular Now
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {popularPlaces.map((place, index) => (
                          <PlacePanelCard
                            key={place.id}
                            place={place}
                            index={index + recentPlaces.length}
                            showMemberCount
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
