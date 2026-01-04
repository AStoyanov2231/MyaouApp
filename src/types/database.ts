export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location_text: string | null;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
};

export type Place = {
  id: string;
  google_place_id: string;
  name: string;
  formatted_address: string | null;
  latitude: number;
  longitude: number;
  place_types: string[];
  photo_reference: string | null;
  cached_photo_url: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  member_count: number;
  message_count: number;
  is_active: boolean;
  created_at: string;
};

export type PlaceMember = {
  id: string;
  place_id: string;
  user_id: string;
  nickname: string | null;
  is_muted: boolean;
  last_read_at: string;
  joined_at: string;
};

export type Message = {
  id: string;
  place_id: string;
  sender_id: string;
  content: string | null;
  message_type: "text" | "image" | "system";
  media_url: string | null;
  media_thumbnail_url: string | null;
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: Profile;
};

export type FriendshipStatus = "pending" | "accepted" | "blocked";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  requested_at: string;
  responded_at: string | null;
  requester?: Profile;
  addressee?: Profile;
};

export type DMThread = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  participant_1?: Profile;
  participant_2?: Profile;
};

export type DMMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  message_type: "text" | "image" | "system";
  media_url: string | null;
  media_thumbnail_url: string | null;
  is_read: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: Profile;
};
