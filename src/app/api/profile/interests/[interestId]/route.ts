import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ interestId: string }> }
) {
  const { interestId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete by tag_id (interestId can be either tag_id or profile_interests.id)
  // First try tag_id, then fallback to id for backwards compatibility
  const { error } = await supabase
    .from("profile_interests")
    .delete()
    .eq("tag_id", interestId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
