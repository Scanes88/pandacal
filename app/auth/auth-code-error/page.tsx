import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Wordmark className="mb-8 text-xl" />
      <h1 className="text-2xl">That link didn&apos;t work</h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        Your magic link may have expired or already been used. Please request a
        fresh one.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-token border border-ink bg-ink px-6 py-3 text-sm text-white transition-opacity hover:opacity-90"
      >
        Back to sign in
      </Link>
    </main>
  );
}
