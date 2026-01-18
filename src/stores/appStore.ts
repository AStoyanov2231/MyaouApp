"use client";
import { create } from "zustand";
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
} from "@/types/database";

// Thread types for unified inbox
export type DMThreadWithParticipants = DMThread & {
  type: "dm";
  participant_1: Profile;
  participant_2: Profile;
  unread_count?: number;
};

export type PlaceThread = {
  id: string;
  type: "place";
  name: string;
  cached_photo_url?: string;
  member_count?: number;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count?: number;
};

export type Thread = DMThreadWithParticipants | PlaceThread;

export type FriendshipWithRequester = Friendship & {
  requester: Profile;
};

// Friend profile with friendship_id for unfriend functionality
export type FriendWithFriendshipId = Profile & {
  friendship_id: string;
};

// Preload API response type
export type PreloadResponse = {
  profile: {
    profile: Profile;
    photos: ProfilePhoto[];
    interests: ProfileInterest[];
    allTags: InterestTag[];
    stats: ProfileStats;
  };
  friends: {
    friends: FriendWithFriendshipId[];
    requests: FriendshipWithRequester[];
  };
  messages: {
    threads: Thread[];
    threadMessages: Record<string, (DMMessage | Message)[]>;
    totalUnread: number;
    currentPlace: (Place & { membership_id: string }) | null;
  };
};

interface AppState {
  // Profile data
  profile: Profile | null;
  photos: ProfilePhoto[];
  interests: ProfileInterest[];
  allTags: InterestTag[];
  stats: ProfileStats;

  // Friends data
  friends: FriendWithFriendshipId[];
  requests: FriendshipWithRequester[];

  // Messages data
  threads: Thread[];
  threadMessages: Record<string, (DMMessage | Message)[]>;
  totalUnread: number;
  currentPlace: (Place & { membership_id: string }) | null;
  activeThreadId: string | null;

  // Loading states
  isPreloading: boolean;
  preloadError: string | null;
  isProfileLoaded: boolean;
  isFriendsLoaded: boolean;
  isMessagesLoaded: boolean;

  // Actions
  preloadAll: () => Promise<void>;
  clearStore: () => void;

  // Profile actions
  setProfile: (profile: Profile) => void;
  setPhotos: (photos: ProfilePhoto[]) => void;
  setInterests: (interests: ProfileInterest[]) => void;
  setAllTags: (tags: InterestTag[]) => void;
  setStats: (stats: ProfileStats) => void;
  updateStats: (stats: Partial<ProfileStats>) => void;

  // Friends actions
  setFriends: (friends: FriendWithFriendshipId[]) => void;
  setRequests: (requests: FriendshipWithRequester[]) => void;
  addFriend: (friend: FriendWithFriendshipId) => void;
  removeFriend: (friendId: string) => void;
  removeRequest: (requestId: string) => void;

  // Messages actions
  setThreads: (threads: Thread[]) => void;
  setThreadMessages: (threadId: string, messages: (DMMessage | Message)[]) => void;
  addMessage: (threadId: string, message: DMMessage | Message) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<DMMessage | Message>) => void;
  updateTotalUnread: (count: number) => void;
  markThreadRead: (threadId: string) => void;
  setCurrentPlace: (place: (Place & { membership_id: string }) | null) => void;
  setActiveThreadId: (threadId: string | null) => void;

  // Presence actions
  onlineUsers: Set<string>;
  setOnlineUsers: (userIds: string[]) => void;

  // UI state
  isPlaceDetailOpen: boolean;
  setPlaceDetailOpen: (open: boolean) => void;
}

const initialStats: ProfileStats = {
  places_count: 0,
  photos_count: 0,
  friends_count: 0,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  profile: null,
  photos: [],
  interests: [],
  allTags: [],
  stats: initialStats,
  friends: [],
  requests: [],
  threads: [],
  threadMessages: {},
  totalUnread: 0,
  currentPlace: null,
  activeThreadId: null,
  onlineUsers: new Set<string>(),
  isPlaceDetailOpen: false,
  isPreloading: false,
  preloadError: null,
  isProfileLoaded: false,
  isFriendsLoaded: false,
  isMessagesLoaded: false,

  // Preload all data
  preloadAll: async () => {
    set({ isPreloading: true, preloadError: null });

    try {
      const res = await fetch("/api/preload");

      if (res.status === 401) {
        // Session expired, redirect to login
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load data");
      }

      const data: PreloadResponse = await res.json();

      set({
        // Profile
        profile: data.profile.profile,
        photos: data.profile.photos,
        interests: data.profile.interests,
        allTags: data.profile.allTags,
        stats: data.profile.stats,
        isProfileLoaded: true,

        // Friends
        friends: data.friends.friends,
        requests: data.friends.requests,
        isFriendsLoaded: true,

        // Messages
        threads: data.messages.threads,
        threadMessages: data.messages.threadMessages,
        totalUnread: data.messages.totalUnread,
        currentPlace: data.messages.currentPlace,
        isMessagesLoaded: true,

        // Done loading
        isPreloading: false,
      });
    } catch (error) {
      console.error("Preload failed:", error);
      set({
        isPreloading: false,
        preloadError: "Failed to load your data. Please try again.",
      });
    }
  },

  // Clear all data (on logout)
  clearStore: () => {
    set({
      profile: null,
      photos: [],
      interests: [],
      allTags: [],
      stats: initialStats,
      friends: [],
      requests: [],
      threads: [],
      threadMessages: {},
      totalUnread: 0,
      currentPlace: null,
      activeThreadId: null,
      onlineUsers: new Set<string>(),
      isPlaceDetailOpen: false,
      isPreloading: false,
      preloadError: null,
      isProfileLoaded: false,
      isFriendsLoaded: false,
      isMessagesLoaded: false,
    });
  },

  // Profile actions
  setProfile: (profile) => set({ profile }),
  setPhotos: (photos) => set({ photos }),
  setInterests: (interests) => set({ interests }),
  setAllTags: (tags) => set({ allTags: tags }),
  setStats: (stats) => set({ stats }),
  updateStats: (partialStats) =>
    set((state) => ({ stats: { ...state.stats, ...partialStats } })),

  // Friends actions
  setFriends: (friends) => set({ friends }),
  setRequests: (requests) => set({ requests }),
  addFriend: (friend) =>
    set((state) => ({
      friends: [...state.friends, friend],
      stats: { ...state.stats, friends_count: state.stats.friends_count + 1 },
    })),
  removeFriend: (friendId) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendId),
      stats: { ...state.stats, friends_count: Math.max(0, state.stats.friends_count - 1) },
    })),
  removeRequest: (requestId) =>
    set((state) => ({
      requests: state.requests.filter((r) => r.id !== requestId),
    })),

  // Messages actions
  setThreads: (threads) => set({ threads }),
  setThreadMessages: (threadId, messages) =>
    set((state) => ({
      threadMessages: { ...state.threadMessages, [threadId]: messages },
    })),
  addMessage: (threadId, message) =>
    set((state) => {
      const existing = state.threadMessages[threadId] || [];
      // Avoid duplicates
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        threadMessages: {
          ...state.threadMessages,
          [threadId]: [...existing, message],
        },
      };
    }),
  updateMessage: (threadId, messageId, updates) =>
    set((state) => {
      const existing = state.threadMessages[threadId];
      if (!existing) return state;
      return {
        threadMessages: {
          ...state.threadMessages,
          [threadId]: existing.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      };
    }),
  updateTotalUnread: (count) => set({ totalUnread: count }),
  markThreadRead: (threadId) =>
    set((state) => {
      const thread = state.threads.find((t) => t.id === threadId);
      const unreadReduction = thread?.unread_count || 0;
      return {
        threads: state.threads.map((t) =>
          t.id === threadId ? { ...t, unread_count: 0 } : t
        ),
        totalUnread: Math.max(0, state.totalUnread - unreadReduction),
      };
    }),
  setCurrentPlace: (place) => set({ currentPlace: place }),
  setActiveThreadId: (threadId) => set({ activeThreadId: threadId }),

  // Presence actions
  setOnlineUsers: (userIds) => set({ onlineUsers: new Set(userIds) }),

  // UI state actions
  setPlaceDetailOpen: (open) => set({ isPlaceDetailOpen: open }),
}));
