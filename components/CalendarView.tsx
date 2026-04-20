"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import { visibilityKey } from "@/components/CalendarSourceList";
import type { CalendarEvent, CalendarSourceKey } from "@/types/calendar";

export type CalendarDashView = "day" | "week" | "month";
export type { CalendarSourceKey as CalendarSource } from "@/types/calendar";

export type CalendarViewHandle = {
  setView: (v: CalendarDashView) => void;
  today: () => void;
  prev: () => void;
  next: () => void;
  gotoDate: (date: Date) => void;
};

export type CreateRange = {
  start: string;
  end: string;
  allDay: boolean;
};

export type ActiveRange = { start: Date; end: Date };

const VIEW_MAP: Record<CalendarDashView, string> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
};

type Props = {
  view: CalendarDashView;
  events: CalendarEvent[];
  visibleCalendars: Record<string, boolean>;
  sourceConnected: Record<CalendarSourceKey, boolean>;
  onCreate: (range: CreateRange) => void;
  onEdit: (event: CalendarEvent) => void;
  onTitleChange?: (title: string) => void;
  onRangeChange?: (range: ActiveRange) => void;
};

const CalendarView = forwardRef<CalendarViewHandle, Props>(function CalendarView(
  {
    view,
    events,
    visibleCalendars,
    sourceConnected,
    onCreate,
    onEdit,
    onTitleChange,
    onRangeChange,
  },
  ref,
) {
  const fcRef = useRef<FullCalendar | null>(null);

  useImperativeHandle(ref, () => ({
    setView: (v) => fcRef.current?.getApi().changeView(VIEW_MAP[v]),
    today: () => fcRef.current?.getApi().today(),
    prev: () => fcRef.current?.getApi().prev(),
    next: () => fcRef.current?.getApi().next(),
    gotoDate: (date) => fcRef.current?.getApi().gotoDate(date),
  }));

  const fcEvents = useMemo<EventInput[]>(() => {
    return events
      .filter((e) => sourceConnected[e.source])
      .filter((e) => visibleCalendars[visibilityKey(e.source, e.calendarId)] ?? true)
      .map(toFCEvent);
  }, [events, visibleCalendars, sourceConnected]);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 p-2 sm:p-4">
      <FullCalendar
        ref={fcRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={VIEW_MAP[view]}
        firstDay={1}
        headerToolbar={false}
        height="100%"
        nowIndicator
        selectable
        selectMirror
        editable={false}
        allDaySlot
        events={fcEvents}
        datesSet={(arg) => {
          onTitleChange?.(arg.view.title);
          onRangeChange?.({ start: arg.view.activeStart, end: arg.view.activeEnd });
        }}
        select={(info) => {
          onCreate({ start: info.startStr, end: info.endStr, allDay: info.allDay });
        }}
        eventClick={(info) => {
          const raw = info.event.extendedProps.raw as CalendarEvent | undefined;
          if (raw) {
            info.jsEvent.preventDefault();
            onEdit(raw);
          }
        }}
      />
    </div>
  );
});

export default CalendarView;

function toFCEvent(e: CalendarEvent): EventInput {
  return {
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    backgroundColor: e.colour,
    borderColor: e.colour,
    extendedProps: { raw: e },
  };
}
