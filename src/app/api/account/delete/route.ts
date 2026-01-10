import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Calculate deletion date (7 days from now)
  const deletionDate = new Date();
  deletionDate.setDate(deletionDate.getDate() + 7);

  // Update profile with scheduled deletion
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({
      scheduled_deletion_at: deletionDate.toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sign out the user
  await supabase.auth.signOut();

  return NextResponse.json({
    success: true,
    scheduled_deletion_at: deletionDate.toISOString(),
    message: "Account scheduled for deletion. You have 7 days to cancel by logging back in.",
  });
}
