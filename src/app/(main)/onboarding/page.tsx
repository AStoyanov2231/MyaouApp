"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InterestTag } from "@/types/database";

const MIN_USERNAME_LENGTH = 3;
const MIN_INTERESTS = 5;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);

  const [interestTags, setInterestTags] = useState<InterestTag[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [interestLoading, setInterestLoading] = useState<string | null>(null);
  const [interestError, setInterestError] = useState("");
  const [tagsLoading, setTagsLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Fetch interest tags
  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch("/api/interests");
        const data = await res.json();
        if (data.tags) {
          setInterestTags(data.tags);
        }
      } catch {
        console.error("Failed to fetch interest tags");
      } finally {
        setTagsLoading(false);
      }
    }
    fetchTags();
  }, []);

  // Fetch existing interests
  useEffect(() => {
    async function fetchUserInterests() {
      try {
        const res = await fetch("/api/profile/interests");
        const data = await res.json();
        if (data.interests) {
          const tagIds = new Set<string>(data.interests.map((i: { tag_id: string }) => i.tag_id));
          setSelectedInterests(tagIds);
        }
      } catch {
        console.error("Failed to fetch user interests");
      }
    }
    fetchUserInterests();
  }, []);

  const handleUsernameSubmit = async () => {
    if (username.length < MIN_USERNAME_LENGTH) {
      setUsernameError(`Username must be at least ${MIN_USERNAME_LENGTH} characters`);
      return;
    }

    setUsernameLoading(true);
    setUsernameError("");

    try {
      const res = await fetch("/api/profile/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUsernameError(data.error || "Failed to update username");
        setUsernameLoading(false);
        return;
      }

      setUsernameSaved(true);
      setTimeout(() => setStep(2), 500);
    } catch {
      setUsernameError("Something went wrong. Please try again.");
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleInterestToggle = useCallback(async (tagId: string) => {
    if (interestLoading) return;

    const isSelected = selectedInterests.has(tagId);

    // Don't allow adding more than 5 interests
    if (!isSelected && selectedInterests.size >= MIN_INTERESTS) {
      return;
    }

    setInterestLoading(tagId);
    setInterestError("");

    try {
      if (isSelected) {
        // Remove interest
        const res = await fetch(`/api/profile/interests/${tagId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setSelectedInterests((prev) => {
            const next = new Set(prev);
            next.delete(tagId);
            return next;
          });
        }
      } else {
        // Add interest
        const res = await fetch("/api/profile/interests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag_id: tagId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setInterestError(data.error || "Failed to add interest");
        } else {
          setSelectedInterests((prev) => new Set(prev).add(tagId));
        }
      }
    } catch {
      setInterestError("Something went wrong. Please try again.");
    } finally {
      setInterestLoading(null);
    }
  }, [interestLoading, selectedInterests]);

  const handleComplete = async () => {
    if (selectedInterests.size < MIN_INTERESTS) {
      setInterestError(`Please select at least ${MIN_INTERESTS} interests`);
      return;
    }

    setCompleting(true);
    setInterestError("");

    try {
      const res = await fetch("/api/profile/complete-onboarding", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setInterestError(data.error || "Failed to complete onboarding");
        setCompleting(false);
        return;
      }

      // Hard redirect after brief delay to ensure state is saved
      setTimeout(() => window.location.replace("/places"), 100);
    } catch {
      setInterestError("Something went wrong. Please try again.");
      setCompleting(false);
    }
  };

  // Group interests by category
  const groupedTags = interestTags.reduce((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, InterestTag[]>);

  const categoryEmojis: Record<string, string> = {
    "Food & Drink": "🍽️",
    "Sports": "⚽",
    "Music": "🎵",
    "Arts": "🎨",
    "Outdoors": "🏕️",
    "Gaming": "🎮",
    "Tech": "💻",
    "Wellness": "🧘",
    "Travel": "✈️",
    "Social": "🎉",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary/90 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full blur-2xl animate-pulse delay-500" />
      </div>

      <div className="w-full max-w-lg z-10">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                step >= 1 ? "bg-accent scale-110" : "bg-white/30"
              )}
            />
            <div className="w-8 h-0.5 bg-white/30">
              <div
                className={cn(
                  "h-full bg-accent transition-all duration-500",
                  step >= 2 ? "w-full" : "w-0"
                )}
              />
            </div>
            <div
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                step >= 2 ? "bg-accent scale-110" : "bg-white/30"
              )}
            />
          </div>
        </div>

        {/* Step 1: Username */}
        <div
          className={cn(
            "transition-all duration-500 transform",
            step === 1
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-full absolute"
          )}
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/20 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to Myaou!
              </h1>
              <p className="text-white/70">
                Let&apos;s set up your profile. What should we call you?
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                    setUsernameError("");
                    setUsernameSaved(false);
                  }}
                  placeholder="username"
                  className="pl-11 h-14 text-lg rounded-xl bg-white border-none"
                  maxLength={20}
                />
                {usernameSaved && (
                  <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>

              <p className="text-white/50 text-sm text-center">
                Letters, numbers, and underscores only. At least 3 characters.
              </p>

              {usernameError && (
                <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{usernameError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleUsernameSubmit}
                disabled={username.length < MIN_USERNAME_LENGTH || usernameLoading}
                className="w-full h-14 rounded-xl bg-accent hover:bg-accent/90 text-foreground font-semibold text-lg"
              >
                {usernameLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Step 2: Interests */}
        <div
          className={cn(
            "transition-all duration-500 transform",
            step === 2
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-full absolute"
          )}
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 md:p-8 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Pick your interests!
              </h1>
              <p className="text-white/70">
                Select at least {MIN_INTERESTS} things you love
              </p>
            </div>

            {/* Selected count */}
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <span className="text-white font-medium">
                  {selectedInterests.size}/{MIN_INTERESTS}
                </span>
                <div className="flex gap-1">
                  {[...Array(MIN_INTERESTS)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        i < selectedInterests.size
                          ? "bg-accent scale-110"
                          : "bg-white/30"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Interest tags */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {tagsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : (
                Object.entries(groupedTags).map(([category, tags]) => (
                  <div key={category}>
                    <h3 className="text-white/80 font-medium mb-3 flex items-center gap-2">
                      <span>{categoryEmojis[category] || "📌"}</span>
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isSelected = selectedInterests.has(tag.id);
                        const isLoading = interestLoading === tag.id;
                        const isDisabled = !isSelected && selectedInterests.size >= MIN_INTERESTS;
                        return (
                          <Badge
                            key={tag.id}
                            variant={isSelected ? "default" : "secondary"}
                            className={cn(
                              "px-4 py-2 text-sm transition-all duration-200",
                              isSelected
                                ? "bg-accent text-foreground hover:bg-accent/90 scale-105 cursor-pointer"
                                : isDisabled
                                  ? "bg-white/10 text-white/40 cursor-not-allowed"
                                  : "bg-white/20 text-white hover:bg-white/30 cursor-pointer",
                              isLoading && "opacity-50"
                            )}
                            onClick={() => !isDisabled && handleInterestToggle(tag.id)}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : tag.icon ? (
                              <span className="mr-1">{tag.icon}</span>
                            ) : null}
                            {tag.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {interestError && (
              <Alert variant="destructive" className="mt-4 bg-red-500/20 border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{interestError}</AlertDescription>
              </Alert>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={selectedInterests.size < MIN_INTERESTS || completing}
                className="flex-1 h-12 rounded-xl bg-accent hover:bg-accent/90 text-foreground font-semibold"
              >
                {completing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Finish
                    <Sparkles className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
