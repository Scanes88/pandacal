import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

/** Admin-only: list of all coaches/physios. */
export default async function CoachesPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const { data: coaches, error } = await supabase
    .from("coaches")
    .select("id, name, email, is_admin, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Coaches"
        description="Coaches and physios with portal access."
      />

      {error ? (
        <EmptyState title="Couldn't load coaches" hint={error.message} />
      ) : !coaches || coaches.length === 0 ? (
        <EmptyState
          title="No coaches yet"
          hint="Coaches you add will appear here. Coach management arrives in a later stage."
        />
      ) : (
        <div className="efpt-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-mute">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.email}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {c.is_admin ? "Administrator" : "Coach"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
