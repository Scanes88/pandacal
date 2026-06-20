"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({
  className = "",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={`rounded-token border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-60 ${className}`}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
