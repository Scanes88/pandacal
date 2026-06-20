/**
 * EFPT wordmark. Placeholder — swap for the real logo asset later.
 * Uses the Georgia serif heading token for the premium-clinical feel.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-heading text-ink ${className}`}
      aria-label="EFPT Portal"
    >
      <span className="font-bold tracking-tight">EFPT</span>
      <span className="text-ink-mute"> Portal</span>
    </span>
  );
}
