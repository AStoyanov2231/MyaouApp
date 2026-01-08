"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, MessageCircle, Users, User, LogOut } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { signOut } from "@/app/(auth)/actions";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

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
    <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-primary">PlaceChat</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            <div className="relative">
              <Icon size={20} />
              {href === "/messages" && unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-2 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full text-[10px] bg-destructive">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </div>
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || profile?.username} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(profile?.display_name || profile?.username || "?")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{profile?.display_name || profile?.username}</p>
            <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
          </div>
        </div>
        <form action={signOut}>
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <LogOut size={16} /> Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
