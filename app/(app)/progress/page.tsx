import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

/** Client-only: progress / outcomes placeholder (charts arrive later). */
export default async function ProgressPage() {
  await requireRole(["client"]);

  return (
    <>
      <PageHeader
        title="Progress"
        description="Your markers, tests and goals over time."
      />
      <EmptyState
        title="Nothing to show yet"
        hint="Metrics, goals and progress charts arrive in a later stage."
      />
    </>
  );
}
