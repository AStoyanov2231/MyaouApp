"use client";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { MapPin, MessageCircle, Users, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useUnreadMessagesContext } from "@/contexts/UnreadMessagesContext";
import { useOptimisticNav } from "@/hooks/useOptimisticNav";

const navItems = [
  { href: "/places", icon: MapPin, label: "Places" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar() {
  const { activePath, setOptimisticPath } = useOptimisticNav();
  const { unreadCount } = useUnreadMessagesContext();
  const navRef = useRef<HTMLElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 });

  // Calculate indicator position based on active nav item (uses optimistic path for instant feel)
  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return;

      const activeIndex = navItems.findIndex(item => activePath.startsWith(item.href));
      if (activeIndex === -1) {
        setIndicatorStyle({ top: 0, height: 0 });
        return;
      }

      const navLinks = navRef.current.querySelectorAll('a');
      const activeLink = navLinks[activeIndex] as HTMLElement;

      if (activeLink) {
        const navRect = navRef.current.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        setIndicatorStyle({
          top: linkRect.top - navRect.top,
          height: linkRect.height,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activePath]);

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen sticky top-0">
      {/* Logo section with subtle gradient */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold gradient-brand-text">Myaou</h1>
      </div>

      {/* Navigation with sliding indicator */}
      <nav ref={navRef} className="flex-1 p-4 space-y-1 relative">
        {/* Sliding active indicator */}
        <div
          className="nav-indicator"
          style={{
            top: `${indicatorStyle.top}px`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.height > 0 ? 1 : 0,
          }}
        />

        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = activePath.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOptimisticPath(href)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    "group-hover:scale-110",
                    isActive && "text-primary"
                  )}
                />
                {href === "/messages" && unreadCount > 0 && (
                  <Badge
                    className={cn(
                      "absolute -top-2 -right-3 h-5 min-w-[20px] px-1.5 flex items-center justify-center",
                      "rounded-full text-[10px] font-semibold bg-destructive text-destructive-foreground",
                      "shadow-glow-primary animate-pulse-soft"
                    )}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </div>
              <span className="transition-colors duration-200">{label}</span>

              {/* Active indicator dot on the right */}
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section with subtle branding */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Made with <span className="text-cat-pink">&#9825;</span> by Myaou
        </p>
      </div>
    </aside>
  );
}
