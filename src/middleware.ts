import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                     request.nextUrl.pathname.startsWith("/welcome");
  const isOnboardingPage = request.nextUrl.pathname === "/onboarding";

  // Unauthenticated users must go to auth pages
  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  // Authenticated users
  if (user) {
    // Fetch profile once for all checks
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    const onboardingComplete = profile?.onboarding_completed ?? false;

    // Redirect auth pages to places (or onboarding if incomplete)
    if (isAuthPage || request.nextUrl.pathname === "/") {
      if (!onboardingComplete) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
      return NextResponse.redirect(new URL("/places", request.url));
    }

    // Check onboarding for non-auth, non-onboarding pages
    if (!isOnboardingPage && !onboardingComplete) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Redirect away from onboarding if already complete
    if (isOnboardingPage && onboardingComplete) {
      return NextResponse.redirect(new URL("/places", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|auth/callback).*)"],
};
