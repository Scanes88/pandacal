"use client";

import MiniCalendar from "./MiniCalendar";
import CalendarSourceList from "./CalendarSourceList";
import type { SubCalendar } from "@/types/calendar";

type Props = {
  month: Date;
  today: Date;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  eventDates: Set<string>;
  onSelectDate: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  calendars: SubCalendar[];
  visible: Record<string, boolean>;
  onToggleCalendar: (key: string) => void;
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({
  month,
  today,
  selectedStart,
  selectedEnd,
  eventDates,
  onSelectDate,
  onMonthChange,
  calendars,
  visible,
  onToggleCalendar,
  open,
  onClose,
}: Props) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white px-4 py-4 shadow-xl transition-transform md:static md:z-0 md:w-[250px] md:max-w-none md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between md:hidden">
          <span className="text-sm font-semibold text-slate-900">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <MiniCalendar
          month={month}
          today={today}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          eventDates={eventDates}
          onSelectDate={onSelectDate}
          onMonthChange={onMonthChange}
        />
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Calendars
          </h2>
          <CalendarSourceList
            calendars={calendars}
            visible={visible}
            onToggle={onToggleCalendar}
          />
        </div>
      </aside>
    </>
  );
}
