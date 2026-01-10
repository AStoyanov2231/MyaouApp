import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OtherProfileClient } from "@/components/profile/OtherProfileClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type {
  Profile,
  ProfilePhoto,
  ProfileInterest,
  ProfileStats,
  Friendship,
} from "@/types/database";

async function getOtherProfileData(userId: string, currentUserId: string) {
  const supabase = await createClient();

  const [profileResult, photosResult, interestsResult, statsResult, friendshipResult] =
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

      // Friendship between current user and profile user
      supabase
        .from("friendships")
        .select("*")
        .or(
          `and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`
        )
        .maybeSingle(),
    ]);

  const profile = profileResult.data as Profile | null;
  const photos = (photosResult.data as ProfilePhoto[]) || [];
  const interests = (interestsResult.data as ProfileInterest[]) || [];
  const friendship = friendshipResult.data as Friendship | null;

  const [placesCount, photosCount, friendsCount] = statsResult;
  const stats: ProfileStats = {
    places_count: placesCount.count ?? 0,
    photos_count: photosCount.count ?? 0,
    friends_count: friendsCount.count ?? 0,
  };

  return { profile, photos, interests, stats, friendship };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // If viewing own profile, redirect to /profile
  if (user.id === userId) {
    redirect("/profile");
  }

  const { profile, photos, interests, stats, friendship } =
    await getOtherProfileData(userId, user.id);

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">User not found</p>
        </Card>
      </div>
    );
  }

  return (
    <OtherProfileClient
      profile={profile}
      photos={photos}
      interests={interests}
      stats={stats}
      friendship={friendship}
      currentUserId={user.id}
    />
  );
}
