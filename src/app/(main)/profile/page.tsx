import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilePageClient } from "@/components/profile/ProfilePageClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type {
  Profile,
  ProfilePhoto,
  ProfileInterest,
  InterestTag,
  ProfileStats,
} from "@/types/database";

async function getProfileData(userId: string) {
  const supabase = await createClient();

  const [profileResult, photosResult, interestsResult, tagsResult, statsResult] =
    await Promise.all([
      // Profile
      supabase.from("profiles").select("*").eq("id", userId).single(),

      // Photos
      supabase
        .from("profile_photos")
        .select("*")
        .eq("user_id", userId)
        .order("display_order", { ascending: true }),

      // User's interests with tags
      supabase
        .from("profile_interests")
        .select("*, tag:interest_tags(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),

      // All available tags
      supabase
        .from("interest_tags")
        .select("*")
        .order("display_order", { ascending: true }),

      // Stats
      Promise.all([
        supabase
          .from("place_history")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("profile_photos")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("friendships")
          .select("*", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
      ]),
    ]);

  const profile = profileResult.data as Profile | null;
  const photos = (photosResult.data as ProfilePhoto[]) || [];
  const interests = (interestsResult.data as ProfileInterest[]) || [];
  const allTags = (tagsResult.data as InterestTag[]) || [];

  const [placesCount, photosCount, friendsCount] = statsResult;
  const stats: ProfileStats = {
    places_count: placesCount.count ?? 0,
    photos_count: photosCount.count ?? 0,
    friends_count: friendsCount.count ?? 0,
  };

  return { profile, photos, interests, allTags, stats };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, photos, interests, allTags, stats } = await getProfileData(
    user.id
  );

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <ProfilePageClient
      profile={profile}
      photos={photos}
      interests={interests}
      allTags={allTags}
      stats={stats}
    />
  );
}
