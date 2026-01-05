"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, MessageCircle, Users, User, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { Profile } from "@/types/database";
import { signOut } from "@/app/(auth)/actions";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const navItems = [
  { href: "/places", icon: MapPin, label: "Places" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary">PlaceChat</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              pathname.startsWith(href)
                ? "bg-primary text-white"
                : "hover:bg-gray-100"
            }`}
          >
            <div className="relative">
              <Icon size={20} />
              {href === "/messages" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={profile?.avatar_url} name={profile?.display_name || profile?.username} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{profile?.display_name || profile?.username}</p>
            <p className="text-sm text-gray-500 truncate">@{profile?.username}</p>
          </div>
        </div>
        <form action={signOut}>
          <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            <LogOut size={16} /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
