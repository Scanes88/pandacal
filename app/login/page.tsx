"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "@/components/Wordmark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/">
            <Wordmark className="text-xl" />
          </Link>
        </div>

        <div className="efpt-card p-8">
          <h1 className="text-2xl">Sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Enter your email and we&apos;ll send you a secure magic link.
          </p>

          {status === "sent" ? (
            <div className="mt-6 rounded-token border border-line bg-surface-raised p-4 text-sm text-ink-soft">
              Check <span className="font-medium text-ink">{email}</span> for a
              sign-in link. You can close this tab once you&apos;ve clicked it.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-mute"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-token border border-line bg-surface px-3 py-2.5 text-sm outline-none transition-colors focus:border-ink"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-token border border-ink bg-ink px-4 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {status === "sending" ? "Sending link…" : "Send magic link"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-mute">
          Trouble signing in? Contact your coach or an administrator.
        </p>
      </div>
    </main>
  );
}
