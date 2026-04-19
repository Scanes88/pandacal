"use client";

import type { CalendarDashView } from "./CalendarView";

type Props = {
  view: CalendarDashView;
  onViewChange: (v: CalendarDashView) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  title: string;
};

const VIEWS: { key: CalendarDashView; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export default function Header({
  view,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  title,
}: Props) {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-slate-900">PandaCal</h1>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="inline-flex rounded-lg border border-slate-200 p-1">
            {VIEWS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onViewChange(key)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  view === key
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={onToday}
            className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>

          <div className="inline-flex items-center gap-1">
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
    </header>
  );
}
