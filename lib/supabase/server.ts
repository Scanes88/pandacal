import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Route Handlers and Server
 * Actions. Wires Supabase auth into Next.js cookies so sessions persist.
 *
 * Note: writing cookies from a Server Component throws (it can only be done in
 * a Route Handler / Server Action / middleware). We swallow that case because
 * the middleware (see middleware.ts) is responsible for refreshing the session
 * cookie on every request.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore, middleware
            // refreshes the session.
          }
        },
      },
    },
  );
}
