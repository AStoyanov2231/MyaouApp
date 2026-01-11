import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FriendsTabsClient } from "@/components/friends/FriendsTabsClient";

async function getFriendsData(userId: string) {
  const supabase = await createClient();

  // Parallel queries for speed
  const [friendsResult, requestsResult] = await Promise.all([
    supabase
      .from("friendships")
      .select("*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted"),
    supabase
      .from("friendships")
      .select("*, requester:profiles!requester_id(*)")
      .eq("addressee_id", userId)
      .eq("status", "pending"),
  ]);

  // Extract friend profiles with friendship_id for unfriend functionality
  const friends = (friendsResult.data || []).map((f) => ({
    ...(f.requester_id === userId ? f.addressee : f.requester),
    friendship_id: f.id,
  }));

  return { friends, requests: requestsResult.data || [] };
}

export default async function FriendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/welcome");

  const { friends, requests } = await getFriendsData(user.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Friends</h1>
      <FriendsTabsClient
        initialFriends={friends}
        initialRequests={requests}
      />
    </div>
  );
}
