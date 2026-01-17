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

export function MobileNav() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessagesContext();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t-0 flex pb-[var(--safe-area-bottom)] z-50">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center pt-4 pb-2 text-xs transition-all duration-200 relative group",
              isActive
                ? "text-primary"
                : "text-muted-foreground active:scale-95"
            )}
          >
            {/* Active indicator bar */}
            {isActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}

            <div className="relative">
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive ? "scale-110" : "group-active:scale-90"
                )}
              />
              {href === "/messages" && unreadCount > 0 && (
                <Badge
                  className={cn(
                    "absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 flex items-center justify-center",
                    "rounded-full text-[10px] font-semibold bg-destructive text-destructive-foreground",
                    "shadow-sm animate-pulse-soft"
                  )}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </div>

            <span
              className={cn(
                "mt-0.5 transition-all duration-200",
                isActive ? "font-medium" : "opacity-80"
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
