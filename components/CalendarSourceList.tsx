"use client";

import {
  SOURCE_ACCOUNT_NAMES,
  getCalendarColour,
  type CalendarSourceKey,
  type SubCalendar,
} from "@/types/calendar";

type Props = {
  calendars: SubCalendar[];
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
};

const SOURCE_ORDER: CalendarSourceKey[] = ["google", "outlook"];

export function visibilityKey(source: CalendarSourceKey, id: string): string {
  return `${source}:${id}`;
}

export default function CalendarSourceList({
  calendars,
  visible,
  onToggle,
}: Props) {
  const bySource = SOURCE_ORDER.map((source) => ({
    source,
    items: calendars.filter((c) => c.source === source),
  })).filter((g) => g.items.length > 0);

  if (bySource.length === 0) {
    return (
      <p className="text-xs text-slate-400">No calendars available.</p>
    );
  }

  return (
    <div className="space-y-4">
      {bySource.map(({ source, items }) => (
        <div key={source} className="space-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {SOURCE_ACCOUNT_NAMES[source]}
          </h3>
          <ul className="space-y-0.5">
            {items.map((cal) => {
              const key = visibilityKey(source, cal.id);
              const on = visible[key] ?? true;
              const colour = getCalendarColour(source, cal.name);
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggle(key)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border transition ${
                        on ? "border-transparent" : "border-slate-300 bg-white"
                      }`}
                      style={on ? { backgroundColor: colour } : {}}
                      aria-hidden
                    >
                      {on && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span
                      className="truncate text-sm text-slate-700"
                      title={cal.name}
                    >
                      {cal.name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
