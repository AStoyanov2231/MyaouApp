import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_PHOTOS = 12;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: photos, error } = await supabase
    .from("profile_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photos });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check photo count
  const { count } = await supabase
    .from("profile_photos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count !== null && count >= MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_PHOTOS} photos allowed` },
      { status: 400 }
    );
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const thumbnail = formData.get("thumbnail") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2MB." },
      { status: 400 }
    );
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Generate file paths with sanitized extension
  const timestamp = Date.now();
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : "jpg";
  const filePath = `${user.id}/${timestamp}.${ext}`;
  const thumbPath = thumbnail ? `${user.id}/${timestamp}_thumb.${ext}` : null;

  // Upload main file
  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Upload thumbnail if provided
  if (thumbnail && thumbPath) {
    await supabase.storage
      .from("profile-photos")
      .upload(thumbPath, thumbnail, { contentType: thumbnail.type });
  }

  // Get public URLs
  const { data: urlData } = supabase.storage
    .from("profile-photos")
    .getPublicUrl(filePath);

  const thumbnailUrl = thumbPath
    ? supabase.storage.from("profile-photos").getPublicUrl(thumbPath).data.publicUrl
    : null;

  // Get current max display_order
  const { data: maxOrderData } = await supabase
    .from("profile_photos")
    .select("display_order")
    .eq("user_id", user.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrderData?.display_order ?? -1) + 1;

  // Insert photo record
  const { data: photo, error: insertError } = await supabase
    .from("profile_photos")
    .insert({
      user_id: user.id,
      storage_path: filePath,
      url: urlData.publicUrl,
      thumbnail_url: thumbnailUrl,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (insertError) {
    // Clean up uploaded files
    await supabase.storage.from("profile-photos").remove([filePath]);
    if (thumbPath) {
      await supabase.storage.from("profile-photos").remove([thumbPath]);
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ photo }, { status: 201 });
}
