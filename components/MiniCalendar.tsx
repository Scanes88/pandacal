"use client";

import { useMemo } from "react";

type Props = {
  month: Date;
  today: Date;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  eventDates: Set<string>;
  onSelectDate: (date: Date) => void;
  onMonthChange: (date: Date) => void;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfMondayWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(d, offset);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function MiniCalendar({
  month,
  today,
  selectedStart,
  selectedEnd,
  eventDates,
  onSelectDate,
  onMonthChange,
}: Props) {
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = startOfMondayWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [month]);

  const goPrev = () =>
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () =>
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const rangeStart = selectedStart ? startOfDay(selectedStart) : null;
  const rangeEnd = selectedEnd ? startOfDay(selectedEnd) : null;

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous month"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next month"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 text-center text-xs">
        {cells.map((date) => {
          const inMonth = date.getMonth() === month.getMonth();
          const isToday = isSameDay(date, today);
          const day = startOfDay(date);
          const inRange =
            rangeStart && rangeEnd
              ? day.getTime() >= rangeStart.getTime() &&
                day.getTime() < rangeEnd.getTime()
              : false;
          const hasEvent = eventDates.has(ymd(date));

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`relative flex aspect-square items-center justify-center rounded-full transition ${
                inRange
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : isToday
                  ? "bg-slate-100 font-semibold text-slate-900 hover:bg-slate-200"
                  : inMonth
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{date.getDate()}</span>
              {hasEvent && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    inRange ? "bg-white" : "bg-slate-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}
