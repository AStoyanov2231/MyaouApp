import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { UnreadMessagesProvider } from "@/contexts/UnreadMessagesContext";
import { PreloadProvider } from "@/components/PreloadProvider";
import { SplashScreen } from "@/components/SplashScreen";
import { NativeBridgeProvider } from "@/components/NativeBridgeProvider";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Use getSession() instead of getUser() - middleware already validated auth
  // getSession() reads from cookies without making a network request
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) redirect("/login");

  return (
    <PreloadProvider>
      <UnreadMessagesProvider>
        <NativeBridgeProvider>
          <SplashScreen />
          <div className="h-screen-safe bg-muted flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto scroll-container pb-[calc(var(--mobile-nav-height)+var(--safe-area-bottom))] md:pb-0">{children}</main>
            <MobileNav />
          </div>
        </NativeBridgeProvider>
      </UnreadMessagesProvider>
    </PreloadProvider>
  );
}
