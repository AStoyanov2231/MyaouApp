"use client";
import { createContext, useContext, ReactNode } from "react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

type UnreadMessagesContextType = {
  unreadCount: number;
  refetch: () => Promise<void>;
};

const UnreadMessagesContext = createContext<UnreadMessagesContextType | null>(null);

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { unreadCount, refetch } = useUnreadMessages();

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, refetch }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessagesContext() {
  const context = useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error("useUnreadMessagesContext must be used within UnreadMessagesProvider");
  }
  return context;
}
