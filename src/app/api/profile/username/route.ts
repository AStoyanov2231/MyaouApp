import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { username } = body;

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const trimmedUsername = username.trim().toLowerCase();

  // Validate length
  if (trimmedUsername.length < MIN_USERNAME_LENGTH) {
    return NextResponse.json(
      { error: `Username must be at least ${MIN_USERNAME_LENGTH} characters` },
      { status: 400 }
    );
  }

  if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
    return NextResponse.json(
      { error: `Username cannot exceed ${MAX_USERNAME_LENGTH} characters` },
      { status: 400 }
    );
  }

  // Validate format (alphanumeric + underscore only)
  if (!USERNAME_REGEX.test(trimmedUsername)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, and underscores" },
      { status: 400 }
    );
  }

  // Update username - database constraint will handle uniqueness
  const { data, error } = await supabase
    .from("profiles")
    .update({ username: trimmedUsername })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
