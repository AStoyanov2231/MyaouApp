"use client";
import { useState, useEffect } from "react";
import { Camera, MapPin, AlertCircle } from "lucide-react";
import { Button, Input, Avatar, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types/database";

export default function ProfilePage() {
  const { profile: authProfile, loading: authLoading, profileLoading } = useAuth();
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

  // Show loading only during initial auth check or profile fetch
  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  // Show error state if profile failed to load
  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-full gap-4">
        <AlertCircle className="text-red-500" size={48} />
        <p className="text-gray-600">Failed to load profile</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="relative">
            <Avatar src={profile.avatar_url} name={profile.display_name || profile.username} size="lg" />
            <button className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full">
              <Camera size={14} />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
            <p className="text-gray-500">@{profile.username}</p>
            {profile.location_text && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
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
            <Input
              label="Display Name"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                maxLength={500}
              />
            </div>
            <Input
              label="Location"
              value={form.location_text}
              onChange={(e) => setForm({ ...form, location_text: e.target.value })}
            />
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        ) : (
          <div>
            {profile.bio && <p className="text-gray-700">{profile.bio}</p>}
            <p className="text-sm text-gray-500 mt-4">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
