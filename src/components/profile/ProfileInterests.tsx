"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ProfileInterest, InterestTag } from "@/types/database";

interface ProfileInterestsProps {
  interests: ProfileInterest[];
  allTags?: InterestTag[];
  isOwner: boolean;
  onAddInterest?: (tagId: string) => Promise<void>;
  onRemoveInterest?: (interestId: string) => Promise<void>;
  className?: string;
}

// Map of icon names to their display - we'll use the name as fallback
const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    "Food & Drink": "",
    "Outdoors": "",
    "Hobbies": "",
    "Entertainment": "",
    "Culture": "",
    "Health": "",
    "Lifestyle": "",
    "Professional": "",
  };
  return emojiMap[category] || "";
};

export function ProfileInterests({
  interests,
  allTags = [],
  isOwner,
  onAddInterest,
  onRemoveInterest,
  className,
}: ProfileInterestsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingTagId, setLoadingTagId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const selectedTagIds = new Set(interests.map((i) => i.tag_id));
  const canAddMore = interests.length < 5;

  // Group tags by category
  const tagsByCategory = allTags.reduce((acc, tag) => {
    if (!acc[tag.category]) {
      acc[tag.category] = [];
    }
    acc[tag.category].push(tag);
    return acc;
  }, {} as Record<string, InterestTag[]>);

  const handleAdd = async (tagId: string) => {
    if (!onAddInterest || !canAddMore) return;
    setLoadingTagId(tagId);
    try {
      await onAddInterest(tagId);
    } finally {
      setLoadingTagId(null);
    }
  };

  const handleRemove = async (interestId: string) => {
    if (!onRemoveInterest) return;
    setRemovingId(interestId);
    try {
      await onRemoveInterest(interestId);
    } finally {
      setRemovingId(null);
    }
  };

  if (interests.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div className={cn("px-4 md:px-6 py-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Interests
        </h3>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="text-primary hover:text-primary/80"
          >
            <Plus className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {interests.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Add interests to help others connect with you
          </p>
        ) : (
          interests.map((interest) => (
            <Badge
              key={interest.id}
              variant="secondary"
              className={cn(
                "bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary px-3 py-1.5 text-sm font-medium",
                removingId === interest.id && "opacity-50"
              )}
            >
              {interest.tag?.name}
              {isOwner && (
                <button
                  onClick={() => handleRemove(interest.id)}
                  disabled={removingId === interest.id}
                  className="ml-2 hover:text-destructive transition-colors"
                >
                  {removingId === interest.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              )}
            </Badge>
          ))
        )}
      </div>

      {/* Interest Picker Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Your Interests</DialogTitle>
            <DialogDescription>
              Select up to 5 interests that describe you. ({interests.length}/5 selected)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {Object.entries(tagsByCategory).map(([category, tags]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {getCategoryEmoji(category)} {category}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.has(tag.id);
                    const isLoading = loadingTagId === tag.id;
                    const isDisabled = (!isSelected && !canAddMore) || isLoading;

                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          if (isSelected) {
                            const interest = interests.find((i) => i.tag_id === tag.id);
                            if (interest) handleRemove(interest.id);
                          } else {
                            handleAdd(tag.id);
                          }
                        }}
                        disabled={isDisabled}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                          isDisabled && !isSelected && "opacity-40 cursor-not-allowed",
                          isLoading && "opacity-70"
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                        ) : isSelected ? (
                          <span className="mr-1">&#10003;</span>
                        ) : null}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
