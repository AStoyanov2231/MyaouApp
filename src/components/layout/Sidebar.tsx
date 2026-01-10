"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, MessageCircle, Users, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUnreadMessagesContext } from "@/contexts/UnreadMessagesContext";

const navItems = [
  { href: "/places", icon: MapPin, label: "Places" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessagesContext();

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
              <Icon className="h-5 w-5" />
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
    </aside>
  );
}
