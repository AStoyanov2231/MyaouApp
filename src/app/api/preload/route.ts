import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  ProfilePhoto,
  ProfileInterest,
  InterestTag,
  ProfileStats,
  Friendship,
  DMThread,
  DMMessage,
  Message,
  Place,
  PlaceMember,
} from "@/types/database";
import { SupabaseClient } from "@supabase/supabase-js";

type DMThreadWithParticipants = DMThread & {
  type: "dm";
  participant_1: Profile;
  participant_2: Profile;
  unread_count?: number;
};

type PlaceThread = {
  id: string;
  type: "place";
  name: string;
  cached_photo_url?: string;
  member_count?: number;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count?: number;
};

type Thread = DMThreadWithParticipants | PlaceThread;

type FriendshipWithRequester = Friendship & {
  requester: Profile;
};

// Fetch profile data
async function fetchProfileData(supabase: SupabaseClient, userId: string) {
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

      // Stats (3 parallel count queries)
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

// Fetch friends data
async function fetchFriendsData(supabase: SupabaseClient, userId: string) {
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

  const requests = (requestsResult.data || []) as FriendshipWithRequester[];

  return { friends, requests };
}

// Fetch messages data (threads + last 20 messages per thread)
async function fetchMessagesData(supabase: SupabaseClient, userId: string) {
  // Get DM threads
  const { data: dmThreadsRaw } = await supabase
    .from("dm_threads")
    .select("*, participant_1:profiles!participant_1_id(*), participant_2:profiles!participant_2_id(*)")
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  // Get user's current place membership
  const { data: membership } = await supabase
    .from("place_members")
    .select("*, place:places(*)")
    .eq("user_id", userId)
    .single();

  const membershipData = membership as (PlaceMember & { place: Place }) | null;

  // Build thread list with unread counts + fetch messages for each thread
  const dmThreads: Thread[] = [];
  const threadMessages: Record<string, (DMMessage | Message)[]> = {};

  // Process DM threads in parallel
  await Promise.all(
    (dmThreadsRaw || []).map(async (thread) => {
      // Get unread count
      const { count } = await supabase
        .from("dm_messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", thread.id)
        .neq("sender_id", userId)
        .eq("is_read", false);

      // Get last 20 messages for this thread
      const { data: messages } = await supabase
        .from("dm_messages")
        .select("*, sender:profiles(*)")
        .eq("thread_id", thread.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);

      dmThreads.push({
        ...thread,
        type: "dm" as const,
        unread_count: count || 0,
      });

      // Store messages in chronological order (oldest first)
      threadMessages[thread.id] = (messages || []).reverse() as DMMessage[];
    })
  );

  // Process place thread if user is in a place
  let placeThread: PlaceThread | null = null;
  let currentPlace: (Place & { membership_id: string }) | null = null;

  if (membershipData?.place) {
    const place = membershipData.place;
    currentPlace = { ...place, membership_id: membershipData.id };

    // Get latest message for preview
    const { data: latestMsg } = await supabase
      .from("messages")
      .select("content, created_at")
      .eq("place_id", place.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("place_id", place.id)
      .neq("sender_id", userId)
      .gt("created_at", membershipData.last_read_at || "1970-01-01");

    // Get last 20 messages for place chat
    const { data: placeMessages } = await supabase
      .from("messages")
      .select("*, sender:profiles(*)")
      .eq("place_id", place.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(20);

    placeThread = {
      id: place.id,
      type: "place" as const,
      name: place.name,
      cached_photo_url: place.cached_photo_url ?? undefined,
      member_count: place.member_count,
      last_message_at: latestMsg?.created_at || membershipData.joined_at,
      last_message_preview: latestMsg?.content || null,
      unread_count: unreadCount || 0,
    };

    // Store place messages in chronological order
    threadMessages[place.id] = (placeMessages || []).reverse() as Message[];
  }

  // Merge threads and sort by last_message_at
  const allThreads: Thread[] = placeThread ? [...dmThreads, placeThread] : dmThreads;
  allThreads.sort(
    (a, b) =>
      new Date(b.last_message_at || 0).getTime() -
      new Date(a.last_message_at || 0).getTime()
  );

  const totalUnread = allThreads.reduce((sum, t) => sum + (t.unread_count || 0), 0);

  return {
    threads: allThreads,
    threadMessages,
    totalUnread,
    currentPlace,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all data in parallel
    const [profileData, friendsData, messagesData] = await Promise.all([
      fetchProfileData(supabase, user.id),
      fetchFriendsData(supabase, user.id),
      fetchMessagesData(supabase, user.id),
    ]);

    return NextResponse.json({
      profile: profileData,
      friends: friendsData,
      messages: messagesData,
    });
  } catch (error) {
    console.error("Preload error:", error);
    return NextResponse.json(
      { error: "Failed to preload data" },
      { status: 500 }
    );
  }
}
