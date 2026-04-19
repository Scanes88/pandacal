"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function SignInPage() {
  const { data: session, status } = useSession();

  const google = session?.google;
  const microsoft = session?.microsoft;

  const googleConnected = !!google?.accessToken && !google.error;
  const microsoftConnected = !!microsoft?.accessToken && !microsoft.error;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">PandaCal</h1>
          <p className="mt-1 text-sm text-gray-600">
            Connect each calendar you want to view together.
          </p>
        </header>

        <div className="space-y-3">
          <ProviderButton
            label="Connect Google Calendar (AG Barr)"
            connected={googleConnected}
            loading={status === "loading"}
            errored={!!google?.error}
            onConnect={() => signIn("google", { callbackUrl: "/signin" })}
            theme="orange"
          />
          <ProviderButton
            label="Connect Outlook Calendar (EFPT)"
            connected={microsoftConnected}
            loading={status === "loading"}
            errored={!!microsoft?.error}
            onConnect={() => signIn("azure-ad", { callbackUrl: "/signin" })}
            theme="blue"
          />
        </div>

        {(googleConnected || microsoftConnected) && (
          <div className="flex items-center justify-between border-t pt-4">
            <a href="/" className="text-sm font-medium text-gray-700 hover:underline">
              Open calendar →
            </a>
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function ProviderButton({
  label,
  connected,
  loading,
  errored,
  onConnect,
  theme,
}: {
  label: string;
  connected: boolean;
  loading: boolean;
  errored: boolean;
  onConnect: () => void;
  theme: "orange" | "blue";
}) {
  const palette =
    theme === "orange"
      ? "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400"
      : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-400";

  const status = errored
    ? "Reconnect"
    : connected
    ? "Connected"
    : loading
    ? "…"
    : "Not connected";

  return (
    <button
      onClick={onConnect}
      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${palette}`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
          connected && !errored ? "bg-white/20" : "bg-black/20"
        }`}
      >
        {status}
      </span>
    </button>
  );
}
