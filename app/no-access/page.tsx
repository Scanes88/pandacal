import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Shown when a user is authenticated but not yet linked to a coach or client
 * record (no role). In Stage 1 an admin provisions accounts by adding a row in
 * `coaches`/`clients` with the user's email; the link is made on next sign-in.
 */
export default async function NoAccessPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Wordmark className="mb-8 text-xl" />
      <h1 className="text-2xl">Account pending</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        You&apos;re signed in as{" "}
        <span className="font-medium text-ink">{profile.email}</span>, but your
        account hasn&apos;t been linked to a coach or client profile yet. An
        administrator needs to add you before you can continue.
      </p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
