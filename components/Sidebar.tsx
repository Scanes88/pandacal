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
}: Props) {
  return (
    <aside className="flex h-full w-[250px] flex-shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white px-4 py-4">
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
  );
}
