import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { UnreadMessagesProvider } from "@/contexts/UnreadMessagesContext";
import { PreloadProvider } from "@/components/PreloadProvider";
import { SplashScreen } from "@/components/SplashScreen";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Use getSession() instead of getUser() - middleware already validated auth
  // getSession() reads from cookies without making a network request
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) redirect("/login");

  return (
    <PreloadProvider>
      <UnreadMessagesProvider>
        <SplashScreen />
        <div className="min-h-screen bg-muted flex">
          <Sidebar />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <MobileNav />
        </div>
      </UnreadMessagesProvider>
    </PreloadProvider>
  );
}
