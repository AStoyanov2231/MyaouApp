-- PlaceChat Database Schema
-- Run this in Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
CREATE TYPE message_type AS ENUM ('text', 'image', 'system');

-- Profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    avatar_url TEXT,
    location_text TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    scheduled_deletion_at TIMESTAMPTZ
);

-- Note: username already has UNIQUE constraint which creates an implicit index

-- Places table (cached Google Places data)
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_place_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    formatted_address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    place_types TEXT[],
    photo_reference TEXT,
    cached_photo_url TEXT,
    rating DECIMAL(2, 1),
    user_ratings_total INTEGER,
    cache_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    fetch_count INTEGER DEFAULT 1,
    last_fetched_at TIMESTAMPTZ DEFAULT NOW(),
    member_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_google_id ON places(google_place_id);

-- Place members table
CREATE TABLE place_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    nickname TEXT,
    is_muted BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(place_id, user_id)
);

CREATE INDEX idx_place_members_place ON place_members(place_id);
CREATE INDEX idx_place_members_user ON place_members(user_id);

-- Place history table (tracks user visits for history panel)
CREATE TABLE place_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, place_id)
);

CREATE INDEX idx_place_history_user_visited ON place_history(user_id, visited_at DESC);
CREATE INDEX idx_place_history_place ON place_history(place_id);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT CHECK (char_length(content) <= 4000),
    message_type message_type DEFAULT 'text',
    media_url TEXT,
    media_thumbnail_url TEXT,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_place ON messages(place_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Friendships table
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status friendship_status DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);

-- DM threads table
CREATE TABLE dm_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (participant_1_id != participant_2_id)
);

-- Unique index to prevent duplicate threads (order-independent)
CREATE UNIQUE INDEX idx_dm_threads_participants_unique
ON dm_threads (LEAST(participant_1_id, participant_2_id), GREATEST(participant_1_id, participant_2_id));
CREATE INDEX idx_dm_threads_participant_1 ON dm_threads(participant_1_id);
CREATE INDEX idx_dm_threads_participant_2 ON dm_threads(participant_2_id);

-- DM messages table
CREATE TABLE dm_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES dm_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT CHECK (char_length(content) <= 4000),
    message_type message_type DEFAULT 'text',
    media_url TEXT,
    media_thumbnail_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dm_messages_thread ON dm_messages(thread_id, created_at DESC);
CREATE INDEX idx_dm_messages_sender ON dm_messages(sender_id);

-- Media uploads table
CREATE TABLE media_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT,
    file_size_bytes INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    is_compressed BOOLEAN DEFAULT TRUE,
    original_size_bytes INTEGER,
    compression_ratio DECIMAL(4, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_uploads_user ON media_uploads(user_id);

-- Profile photos table
CREATE TABLE profile_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_avatar BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profile_photos_user ON profile_photos(user_id);

-- Interest tags table (lookup table for available interests)
CREATE TABLE interest_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    icon TEXT,
    display_order INTEGER DEFAULT 0
);

-- Profile interests table (user's selected interests)
CREATE TABLE profile_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES interest_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tag_id)
);

CREATE INDEX idx_profile_interests_user ON profile_interests(user_id);
CREATE INDEX idx_profile_interests_tag ON profile_interests(tag_id);

-- Triggers and functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER places_updated_at BEFORE UPDATE ON places FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update place member count
CREATE OR REPLACE FUNCTION update_place_member_count()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE places SET member_count = member_count + 1 WHERE id = NEW.place_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE places SET member_count = member_count - 1 WHERE id = OLD.place_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER place_members_count AFTER INSERT OR DELETE ON place_members FOR EACH ROW EXECUTE FUNCTION update_place_member_count();

-- Auto-record place visit when joining a place
CREATE OR REPLACE FUNCTION record_place_visit()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO place_history (user_id, place_id, visited_at)
    VALUES (NEW.user_id, NEW.place_id, NOW())
    ON CONFLICT (user_id, place_id)
    DO UPDATE SET visited_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER record_visit_on_join AFTER INSERT ON place_members FOR EACH ROW EXECUTE FUNCTION record_place_visit();

-- Update place message count
CREATE OR REPLACE FUNCTION update_place_message_count()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE places SET message_count = message_count + 1 WHERE id = NEW.place_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER place_messages_count AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_place_message_count();

-- Update DM thread last message
CREATE OR REPLACE FUNCTION update_dm_thread_last_message()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    UPDATE dm_threads SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100)
    WHERE id = NEW.thread_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dm_messages_update_thread AFTER INSERT ON dm_messages FOR EACH ROW EXECUTE FUNCTION update_dm_thread_last_message();

-- Enforce maximum 5 interests per user
CREATE OR REPLACE FUNCTION check_max_interests()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF (SELECT COUNT(*) FROM profile_interests WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Maximum of 5 interests allowed per user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_interests BEFORE INSERT ON profile_interests FOR EACH ROW EXECUTE FUNCTION check_max_interests();

-- Auto-create profile on user signup
-- Note: This trigger uses SECURITY DEFINER to bypass RLS
-- SET search_path ensures the function runs in the correct schema context
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
EXCEPTION WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: Check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND ((requester_id = user_a AND addressee_id = user_b)
             OR (requester_id = user_b AND addressee_id = user_a))
    );
END;
$$ LANGUAGE plpgsql;

-- Helper: Get or create DM thread
CREATE OR REPLACE FUNCTION get_or_create_dm_thread(user_a UUID, user_b UUID)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    thread_id UUID;
BEGIN
    IF NOT are_friends(user_a, user_b) THEN
        RAISE EXCEPTION 'Users must be friends to start a DM';
    END IF;

    SELECT id INTO thread_id FROM dm_threads
    WHERE (participant_1_id = user_a AND participant_2_id = user_b)
       OR (participant_1_id = user_b AND participant_2_id = user_a);

    IF thread_id IS NULL THEN
        INSERT INTO dm_threads (participant_1_id, participant_2_id)
        VALUES (LEAST(user_a, user_b), GREATEST(user_a, user_b))
        RETURNING id INTO thread_id;
    END IF;

    RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- Helper: Get popular places (fallback)
CREATE OR REPLACE FUNCTION get_popular_places(limit_count INTEGER DEFAULT 20)
RETURNS SETOF places
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM places
    WHERE is_active = TRUE
    ORDER BY member_count DESC, message_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check place membership (SECURITY DEFINER bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION is_place_member(p_place_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM place_members
    WHERE place_id = p_place_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, self update
CREATE POLICY "Profiles are publicly viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING ((select auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Places: authenticated read
CREATE POLICY "Places are viewable by authenticated users" ON places FOR SELECT TO authenticated USING (true);

-- Place members (uses helper function to avoid RLS recursion)
CREATE POLICY "Users can view place members" ON place_members FOR SELECT TO authenticated
USING (user_id = (select auth.uid()) OR is_place_member(place_id, (select auth.uid())));
CREATE POLICY "Users can join places" ON place_members FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can leave places" ON place_members FOR DELETE TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can update own membership" ON place_members FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));

-- Messages (uses helper function for membership check)
CREATE POLICY "Members can view place messages" ON messages FOR SELECT TO authenticated
USING (is_place_member(place_id, (select auth.uid())));
CREATE POLICY "Members can send messages" ON messages FOR INSERT TO authenticated
WITH CHECK (sender_id = (select auth.uid()) AND is_place_member(place_id, (select auth.uid())));
CREATE POLICY "Users can edit own messages" ON messages FOR UPDATE TO authenticated USING (sender_id = (select auth.uid()));
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE TO authenticated USING (sender_id = (select auth.uid()));

-- Friendships
CREATE POLICY "Users can view own friendships" ON friendships FOR SELECT TO authenticated
USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT TO authenticated WITH CHECK (requester_id = (select auth.uid()));
CREATE POLICY "Addressee can respond to requests" ON friendships FOR UPDATE TO authenticated USING (addressee_id = (select auth.uid()));
CREATE POLICY "Users can remove friendships" ON friendships FOR DELETE TO authenticated
USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));

-- DM threads
CREATE POLICY "Users can view own DM threads" ON dm_threads FOR SELECT TO authenticated
USING (participant_1_id = (select auth.uid()) OR participant_2_id = (select auth.uid()));

-- DM messages
CREATE POLICY "Users can view DM messages in their threads" ON dm_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM dm_threads WHERE id = dm_messages.thread_id
AND (participant_1_id = (select auth.uid()) OR participant_2_id = (select auth.uid()))));
CREATE POLICY "Users can send DMs in their threads" ON dm_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM dm_threads WHERE id = dm_messages.thread_id
AND (participant_1_id = (select auth.uid()) OR participant_2_id = (select auth.uid()))));
CREATE POLICY "Recipients can mark messages as read" ON dm_messages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM dm_threads WHERE id = dm_messages.thread_id
AND (participant_1_id = (select auth.uid()) OR participant_2_id = (select auth.uid()))));
CREATE POLICY "Users can delete own DMs" ON dm_messages FOR DELETE TO authenticated USING (sender_id = (select auth.uid()));

-- Media uploads
CREATE POLICY "Users can view own uploads" ON media_uploads FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can create uploads" ON media_uploads FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

-- Place history
CREATE POLICY "Users can view own place history" ON place_history FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can insert own place history" ON place_history FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update own place history" ON place_history FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));

-- Profile photos
CREATE POLICY "Users can view all profile photos" ON profile_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can upload own photos" ON profile_photos FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update own photos" ON profile_photos FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can delete own photos" ON profile_photos FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- Interest tags (public read-only lookup table)
CREATE POLICY "Interest tags are publicly viewable" ON interest_tags FOR SELECT USING (true);

-- Profile interests
CREATE POLICY "Users can view all interests" ON profile_interests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add own interests" ON profile_interests FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can remove own interests" ON profile_interests FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

-- Seed default interest tags
INSERT INTO interest_tags (name, category, icon, display_order) VALUES
('Photography', 'Hobbies', 'camera', 1),
('Music', 'Hobbies', 'music', 2),
('Gaming', 'Hobbies', 'gamepad-2', 3),
('Travel', 'Lifestyle', 'plane', 4),
('Fitness', 'Lifestyle', 'dumbbell', 5),
('Food & Dining', 'Lifestyle', 'utensils', 6),
('Art', 'Hobbies', 'palette', 7),
('Movies', 'Entertainment', 'film', 8),
('Reading', 'Hobbies', 'book-open', 9),
('Sports', 'Lifestyle', 'trophy', 10),
('Technology', 'Professional', 'cpu', 11),
('Fashion', 'Lifestyle', 'shirt', 12),
('Nature', 'Lifestyle', 'trees', 13),
('Pets', 'Lifestyle', 'paw-print', 14),
('Cooking', 'Hobbies', 'chef-hat', 15),
('Dancing', 'Hobbies', 'music-2', 16),
('Yoga', 'Lifestyle', 'heart', 17),
('Coffee', 'Lifestyle', 'coffee', 18),
('Nightlife', 'Entertainment', 'moon', 19),
('Networking', 'Professional', 'users', 20);
