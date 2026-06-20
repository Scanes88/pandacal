export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="efpt-empty">
      <p className="font-heading text-lg text-ink">{title}</p>
      {hint && <p className="mt-2 max-w-sm text-sm text-ink-mute">{hint}</p>}
    </div>
  );
}
