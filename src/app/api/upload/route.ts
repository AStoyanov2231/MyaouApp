import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const thumbnail = formData.get("thumbnail") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `${user.id}/${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  let thumbnailUrl = null;
  if (thumbnail) {
    const thumbPath = `${user.id}/${timestamp}_thumb.${ext}`;
    const { error: thumbError } = await supabase.storage
      .from("media")
      .upload(thumbPath, thumbnail, { contentType: thumbnail.type });

    if (!thumbError) {
      const { data } = supabase.storage.from("media").getPublicUrl(thumbPath);
      thumbnailUrl = data.publicUrl;
    }
  }

  const { data } = supabase.storage.from("media").getPublicUrl(filePath);

  await supabase.from("media_uploads").insert({
    user_id: user.id,
    storage_path: filePath,
    original_filename: file.name,
    file_size_bytes: file.size,
    mime_type: file.type,
  });

  return NextResponse.json({ url: data.publicUrl, thumbnailUrl });
}
