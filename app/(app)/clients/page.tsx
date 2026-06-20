import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

/**
 * Clients list.
 * - Coach: sees only their own clients (RLS scopes by coach_id).
 * - Admin: sees all clients (RLS grants admin full read).
 * The query itself is identical — RLS does the filtering. This page is the
 * Stage 1 proof that role-scoped access works end to end.
 */
export default async function ClientsPage() {
  const profile = await requireRole(["coach", "admin"]);
  const supabase = createClient();

  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name, email, status, coach_id, created_at")
    .order("created_at", { ascending: false });

  const isAdmin = profile.role === "admin";

  return (
    <>
      <PageHeader
        title={isAdmin ? "All clients" : "Clients"}
        description={
          isAdmin
            ? "Every client across all coaches."
            : "The athletes you coach."
        }
      />

      {error ? (
        <EmptyState
          title="Couldn't load clients"
          hint={error.message}
        />
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          hint={
            isAdmin
              ? "Clients added by any coach will appear here."
              : "Your clients will appear here once they're added. Client management arrives in a later stage."
          }
        />
      ) : (
        <div className="efpt-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-mute">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-4 py-3 text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
