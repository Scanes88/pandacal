import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

/** Admin-only: the shared master exercise library. */
export default async function LibraryPage() {
  await requireRole(["admin"]);
  const supabase = createClient();

  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, category, is_bespoke")
    .order("name", { ascending: true });

  return (
    <>
      <PageHeader
        title="Exercise library"
        description="The shared master library used across all programmes."
      />

      {error ? (
        <EmptyState title="Couldn't load exercises" hint={error.message} />
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState
          title="Library is empty"
          hint="The exercise library editor arrives in a later stage."
        />
      ) : (
        <div className="efpt-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-mute">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{e.name}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {e.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {e.is_bespoke ? "Bespoke" : "Shared"}
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
