import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CurrentProfile, Role } from "@/lib/types";

/**
 * Resolve the signed-in user into an EFPT profile + role.
 *
 * Role resolution:
 *   - A row in `coaches` with is_admin = true  -> "admin"
 *   - A row in `coaches` with is_admin = false -> "coach"
 *   - A row in `clients`                       -> "client"
 *   - Otherwise role is null (authenticated but not yet provisioned).
 *
 * Returns null when there is no authenticated user at all.
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, user_id, name, email, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (coach) {
    return {
      userId: user.id,
      email: user.email ?? null,
      role: coach.is_admin ? "admin" : "coach",
      coach,
      client: null,
    };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, coach_id, name, email, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (client) {
    return {
      userId: user.id,
      email: user.email ?? null,
      role: "client",
      coach: null,
      client,
    };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: null,
    coach: null,
    client: null,
  };
}

/**
 * Page guard for Server Components. Ensures the user is signed in, provisioned,
 * and holds one of the allowed roles. Redirects otherwise. Returns the profile.
 */
export async function requireRole(
  allowed: Role[],
): Promise<CurrentProfile & { role: Role }> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (!profile.role) redirect("/no-access");
  if (!allowed.includes(profile.role)) redirect("/dashboard");

  return profile as CurrentProfile & { role: Role };
}

/** The default landing route for each role. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/coaches";
    case "coach":
      return "/clients";
    case "client":
      return "/training";
  }
}
