import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

/** Client-only: their own programmes (empty in Stage 1). */
export default async function TrainingPage() {
  const profile = await requireRole(["client"]);
  const supabase = createClient();

  const { data: programmes, error } = await supabase
    .from("programmes")
    .select("id, name, status, start_date")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Training"
        description={`Your programmes, ${profile.client?.name ?? ""}.`}
      />

      {error ? (
        <EmptyState title="Couldn't load training" hint={error.message} />
      ) : !programmes || programmes.length === 0 ? (
        <EmptyState
          title="No programme yet"
          hint="When your coach assigns a programme it'll show up here. Session logging arrives in a later stage."
        />
      ) : (
        <div className="space-y-3">
          {programmes.map((p) => (
            <div key={p.id} className="efpt-card flex items-center justify-between p-4">
              <span className="text-ink">{p.name}</span>
              <span className="text-xs uppercase tracking-wide text-ink-mute">
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
