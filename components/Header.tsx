"use client";

import type { CalendarDashView } from "./CalendarView";

type Props = {
  view: CalendarDashView;
  onViewChange: (v: CalendarDashView) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  title: string;
  onToggleSidebar?: () => void;
};

const VIEWS: { key: CalendarDashView; label: string; short: string }[] = [
  { key: "day", label: "Day", short: "D" },
  { key: "week", label: "Week", short: "W" },
  { key: "month", label: "Month", short: "M" },
];

export default function Header({
  view,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  title,
  onToggleSidebar,
}: Props) {
  return (
    <header className="border-b border-slate-200 bg-white px-2 py-2 sm:px-6 sm:py-3">
      {/* Desktop: single row. Mobile: two rows (identity + view/today, then title+arrows). */}
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Open menu"
              className="flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
            PandaCal
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 sm:p-1">
            {VIEWS.map(({ key, label, short }) => (
              <button
                key={key}
                onClick={() => onViewChange(key)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  view === key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onToday}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:px-3 sm:text-sm"
          >
            Today
          </button>

          {/* Desktop-only nav cluster */}
          <div className="hidden items-center gap-1 md:inline-flex">
            <button
              onClick={onPrev}
              aria-label="Previous"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              &lt;
            </button>
            <span className="min-w-[10rem] text-center text-sm font-medium text-slate-900">
              {title}
            </span>
            <button
              onClick={onNext}
              aria-label="Next"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-only nav + title row */}
      <div className="mt-2 flex items-center justify-between gap-2 md:hidden">
        <button
          onClick={onPrev}
          aria-label="Previous"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-base font-medium text-slate-700 hover:bg-slate-50"
        >
          &lt;
        </button>
        <span className="truncate text-center text-sm font-semibold text-slate-900">
          {title}
        </span>
        <button
          onClick={onNext}
          aria-label="Next"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-base font-medium text-slate-700 hover:bg-slate-50"
        >
          &gt;
        </button>
      </div>
    </header>
  );
}
