import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DEV_USER_EMAIL = "dev@localhost.test";
const DEV_USER_PASSWORD = "devpassword123";

export async function POST() {
  // Multiple layers of protection for dev-only endpoint
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  const serviceClient = createServiceClient();

  // Check if dev user exists
  const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
  const devUser = existingUsers?.users?.find(
    (u) => u.email === DEV_USER_EMAIL
  );

  if (!devUser) {
    // Create dev user
    const { data: newUser, error: createError } =
      await serviceClient.auth.admin.createUser({
        email: DEV_USER_EMAIL,
        password: DEV_USER_PASSWORD,
        email_confirm: true,
      });

    if (createError || !newUser.user) {
      console.error("Failed to create dev user:", createError);
      return NextResponse.json(
        { error: "Failed to create dev user" },
        { status: 500 }
      );
    }

    // Create profile for dev user
    const { error: profileError } = await serviceClient.from("profiles").insert({
      id: newUser.user.id,
      username: "dev_admin",
      display_name: "Dev Admin",
      onboarding_completed: true,
    });

    if (profileError) {
      console.error("Failed to create dev profile:", profileError);
      return NextResponse.json(
        { error: "Failed to create dev profile" },
        { status: 500 }
      );
    }
  }

  // Sign in as the dev user using the regular client (to set cookies)
  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: DEV_USER_EMAIL,
    password: DEV_USER_PASSWORD,
  });

  if (signInError || !data.session) {
    console.error("Failed to sign in dev user:", signInError);
    return NextResponse.json(
      { error: "Failed to sign in dev user" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, redirectUrl: "/places" });
}
