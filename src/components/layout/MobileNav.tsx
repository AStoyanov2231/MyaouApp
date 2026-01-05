"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, MessageCircle, Users, User } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const navItems = [
  { href: "/places", icon: MapPin, label: "Places" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { unreadCount } = useUnreadMessages();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex">
      {navItems.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`flex-1 flex flex-col items-center py-2 text-xs ${
            pathname.startsWith(href) ? "text-primary" : "text-gray-500"
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
  );
}
