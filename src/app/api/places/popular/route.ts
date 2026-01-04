import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: places } = await supabase
    .from("places")
    .select("*")
    .eq("is_active", true)
    .order("member_count", { ascending: false })
    .limit(20);

  return NextResponse.json({ places: places || [] });
}
