import { redirect } from "next/navigation";
import { getCurrentProfile, homePathForRole } from "@/lib/auth";

/** Post-login entry point — routes each role to its home page. */
export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.role) redirect("/no-access");
  redirect(homePathForRole(profile.role));
}
