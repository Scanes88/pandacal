import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Wordmark } from "@/components/Wordmark";

export default async function HomePage() {
  // If already signed in, send straight into the app.
  const profile = await getCurrentProfile();
  if (profile) redirect(profile.role ? "/dashboard" : "/no-access");

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-6">
          <Wordmark className="text-lg" />
          <Link
            href="/login"
            className="rounded-token border border-ink bg-ink px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-shell flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-ink-mute">
          Elite Formula Performance Training
        </p>
        <h1 className="max-w-2xl text-balance text-4xl leading-tight sm:text-5xl">
          The coaching portal for athletes and their coaches.
        </h1>
        <p className="mt-5 max-w-xl text-ink-soft">
          Programmes, progress and outcomes in one clean place. Sign in with a
          magic link — no passwords.
        </p>
        <Link
          href="/login"
          className="mt-8 rounded-token border border-ink bg-ink px-6 py-3 text-sm text-white transition-opacity hover:opacity-90"
        >
          Sign in to your portal
        </Link>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-shell px-6 py-6 text-center text-xs text-ink-mute">
          © {new Date().getFullYear()} Elite Formula Performance Training
        </div>
      </footer>
    </main>
  );
}
