import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Use getSession() instead of getUser() - middleware already validated auth
  // getSession() reads from cookies without making a network request
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) redirect("/login");
  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-muted flex">
      <Sidebar profile={profile} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
