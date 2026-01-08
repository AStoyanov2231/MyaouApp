"use client";
import { useState, useEffect } from "react";
import { Camera, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types/database";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { profile: authProfile, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: "", bio: "", location_text: "" });

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
      setForm({
        display_name: authProfile.display_name || "",
        bio: authProfile.bio || "",
        location_text: authProfile.location_text || "",
      });
    }
  }, [authProfile]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setProfile(data.profile);
    setEditing(false);
    setSaving(false);
  };

  // Show loading only during initial auth check
  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </Card>
      </div>
    );
  }

  // Show error state if profile failed to load
  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-full gap-4">
        <AlertCircle className="text-destructive" size={48} />
        <p className="text-muted-foreground">Failed to load profile</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(profile.display_name || profile.username)}
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1 rounded-full">
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.location_text && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin size={14} /> {profile.location_text}
              </p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location_text}
                onChange={(e) => setForm({ ...form, location_text: e.target.value })}
                className="h-10"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        ) : (
          <div>
            {profile.bio && <p className="text-foreground">{profile.bio}</p>}
            <p className="text-sm text-muted-foreground mt-4">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
