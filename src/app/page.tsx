import { redirect } from "next/navigation";

// Middleware handles auth redirects for "/" route:
// - Authenticated users -> /places
// - Unauthenticated users -> /welcome
// This page should rarely render, but defaults to /places as fallback
export default async function Home() {
  redirect("/places");
}
