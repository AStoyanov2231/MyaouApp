"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, MessageCircle, Users, User } from "lucide-react";

const navItems = [
  { href: "/places", icon: MapPin, label: "Places" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const pathname = usePathname();

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
          <Icon size={20} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
