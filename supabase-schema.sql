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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);

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

-- Triggers and functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
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
RETURNS TRIGGER AS $$
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

-- Update place message count
CREATE OR REPLACE FUNCTION update_place_message_count()
RETURNS TRIGGER AS $$
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
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dm_threads SET
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100)
    WHERE id = NEW.thread_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dm_messages_update_thread AFTER INSERT ON dm_messages FOR EACH ROW EXECUTE FUNCTION update_dm_thread_last_message();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper: Check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND ((requester_id = user_a AND addressee_id = user_b)
             OR (requester_id = user_b AND addressee_id = user_a))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Get or create DM thread
CREATE OR REPLACE FUNCTION get_or_create_dm_thread(user_a UUID, user_b UUID)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Get popular places (fallback)
CREATE OR REPLACE FUNCTION get_popular_places(limit_count INTEGER DEFAULT 20)
RETURNS SETOF places AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM places
    WHERE is_active = TRUE
    ORDER BY member_count DESC, message_count DESC
    LIMIT limit_count;
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

-- Profiles: public read, self update
CREATE POLICY "Profiles are publicly viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Places: authenticated read
CREATE POLICY "Places are viewable by authenticated users" ON places FOR SELECT TO authenticated USING (true);

-- Place members
CREATE POLICY "Members can view place members" ON place_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM place_members pm WHERE pm.place_id = place_members.place_id AND pm.user_id = auth.uid()));
CREATE POLICY "Users can join places" ON place_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave places" ON place_members FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own membership" ON place_members FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Messages
CREATE POLICY "Members can view place messages" ON messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM place_members WHERE place_id = messages.place_id AND user_id = auth.uid()));
CREATE POLICY "Members can send messages" ON messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM place_members WHERE place_id = messages.place_id AND user_id = auth.uid()));
CREATE POLICY "Users can edit own messages" ON messages FOR UPDATE TO authenticated USING (sender_id = auth.uid());
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- Friendships
CREATE POLICY "Users can view own friendships" ON friendships FOR SELECT TO authenticated
USING (requester_id = auth.uid() OR addressee_id = auth.uid());
CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Addressee can respond to requests" ON friendships FOR UPDATE TO authenticated USING (addressee_id = auth.uid());
CREATE POLICY "Users can remove friendships" ON friendships FOR DELETE TO authenticated
USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- DM threads
CREATE POLICY "Users can view own DM threads" ON dm_threads FOR SELECT TO authenticated
USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- DM messages
CREATE POLICY "Users can view DM messages in their threads" ON dm_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM dm_threads WHERE id = dm_messages.thread_id
AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())));
CREATE POLICY "Users can send DMs in their threads" ON dm_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM dm_threads WHERE id = dm_messages.thread_id
AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())));
CREATE POLICY "Users can delete own DMs" ON dm_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

-- Media uploads
CREATE POLICY "Users can view own uploads" ON media_uploads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can create uploads" ON media_uploads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
