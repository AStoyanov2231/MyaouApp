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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex">
      {navItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex-1 flex flex-col items-center py-2 text-xs",
            pathname.startsWith(href) ? "text-primary" : "text-muted-foreground"
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
  );
}
