import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_INTERESTS_REQUIRED = 5;
// Matches temp username format: user_XXXXXXXX (8 hex characters)
const TEMP_USERNAME_REGEX = /^user_[a-f0-9]{8}$/i;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check profile has a proper username (not temp)
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (!profile || TEMP_USERNAME_REGEX.test(profile.username)) {
    return NextResponse.json(
      { error: "Please set your username first" },
      { status: 400 }
    );
  }

  // Check user has at least 5 interests
  const { count: interestCount } = await supabase
    .from("profile_interests")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!interestCount || interestCount < MIN_INTERESTS_REQUIRED) {
    return NextResponse.json(
      { error: `Please select at least ${MIN_INTERESTS_REQUIRED} interests` },
      { status: 400 }
    );
  }

  // Mark onboarding as complete
  const { data, error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data, success: true });
}
