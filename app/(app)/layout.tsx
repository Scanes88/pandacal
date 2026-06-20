import { getCurrentProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { SidebarNav } from "@/components/SidebarNav";
import { SignOutButton } from "@/components/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  coach: "Coach",
  client: "Client",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.role) redirect("/no-access");

  const displayName =
    profile.coach?.name ?? profile.client?.name ?? profile.email ?? "Account";

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-shell flex-col px-4 sm:px-6">
        <header className="flex h-16 items-center justify-between border-b border-line">
          <Wordmark className="text-lg" />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm leading-tight text-ink">
                {displayName}
              </div>
              <div className="text-xs leading-tight text-ink-mute">
                {ROLE_LABEL[profile.role]}
              </div>
            </div>
            <SignOutButton />
          </div>
        </header>

        <div className="flex flex-1 gap-8 py-8">
          <aside className="w-48 shrink-0">
            <SidebarNav role={profile.role} />
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
