import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { display_order, is_avatar, is_private } = body;

  // Verify ownership
  const { data: existing } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof display_order === "number") {
    updates.display_order = display_order;
  }

  if (typeof is_private === "boolean") {
    updates.is_private = is_private;
    // If making a photo private that is currently the avatar, clear the avatar
    if (is_private && existing.is_avatar) {
      updates.is_avatar = false;
      await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
    }
  }

  if (is_avatar === true) {
    // Prevent private photos from being set as avatar (avatar is public)
    if (existing.is_private) {
      return NextResponse.json(
        { error: "Cannot set a private photo as avatar. Make the photo public first." },
        { status: 400 }
      );
    }

    // Clear other avatars first
    await supabase
      .from("profile_photos")
      .update({ is_avatar: false })
      .eq("user_id", user.id);

    updates.is_avatar = true;

    // Also update profile avatar_url
    await supabase
      .from("profiles")
      .update({ avatar_url: existing.url })
      .eq("id", user.id);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ photo: existing });
  }

  const { data: photo, error } = await supabase
    .from("profile_photos")
    .update(updates)
    .eq("id", photoId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photo });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get photo to delete
  const { data: photo } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .single();

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Delete from storage
  await supabase.storage.from("profile-photos").remove([photo.storage_path]);

  // Delete thumbnail if exists
  if (photo.thumbnail_url) {
    const thumbPath = photo.storage_path.replace(/\.(\w+)$/, "_thumb.$1");
    await supabase.storage.from("profile-photos").remove([thumbPath]);
  }

  // Delete database record
  const { error } = await supabase
    .from("profile_photos")
    .delete()
    .eq("id", photoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If this was the avatar, clear profile avatar_url
  if (photo.is_avatar) {
    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
  }

  return NextResponse.json({ success: true });
}
