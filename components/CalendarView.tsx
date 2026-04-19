"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventInput,
  EventSourceFuncArg,
  EventSourceInput,
} from "@fullcalendar/core";
import type { CalendarEvent, CalendarSourceKey } from "@/types/calendar";

export type CalendarDashView = "day" | "week" | "month";
export type { CalendarSourceKey as CalendarSource } from "@/types/calendar";

export type CalendarViewHandle = {
  refetch: () => void;
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

const REFRESH_MS = 15 * 60 * 1000;
const NAV_DEBOUNCE_MS = 120;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { at: number; events: CalendarEvent[] };
const eventCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CalendarEvent[]>>();
const abortRegistry = new Map<CalendarSourceKey, AbortController>();

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function cacheKey(
  source: CalendarSourceKey,
  ids: string[],
  start: string,
  end: string,
): string {
  return `${source}|${dateOnly(start)}|${dateOnly(end)}|${[...ids].sort().join(",")}`;
}

function readCache(key: string): CalendarEvent[] | null {
  const hit = eventCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    eventCache.delete(key);
    return null;
  }
  return hit.events;
}

function writeCache(key: string, events: CalendarEvent[]) {
  eventCache.set(key, { at: Date.now(), events });
}

function startOfMondayUTC(d: Date): Date {
  const day = d.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset));
}

function addDaysUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

function adjacentRanges(
  startStr: string,
  endStr: string,
): { prev: [string, string]; next: [string, string] } {
  const start = new Date(dateOnly(startStr) + "T00:00:00Z");
  const end = new Date(dateOnly(endStr) + "T00:00:00Z");
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (days >= 28) {
    const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    const prevFirst = new Date(Date.UTC(mid.getUTCFullYear(), mid.getUTCMonth() - 1, 1));
    const nextFirst = new Date(Date.UTC(mid.getUTCFullYear(), mid.getUTCMonth() + 1, 1));
    const prevStart = startOfMondayUTC(prevFirst);
    const nextStart = startOfMondayUTC(nextFirst);
    return {
      prev: [prevStart.toISOString(), addDaysUTC(prevStart, 42).toISOString()],
      next: [nextStart.toISOString(), addDaysUTC(nextStart, 42).toISOString()],
    };
  }
  const duration = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - duration);
  const nextEnd = new Date(end.getTime() + duration);
  return {
    prev: [prevStart.toISOString(), start.toISOString()],
    next: [end.toISOString(), nextEnd.toISOString()],
  };
}

async function fetchRange(
  source: CalendarSourceKey,
  ids: string[],
  startStr: string,
  endStr: string,
  signal?: AbortSignal,
): Promise<CalendarEvent[]> {
  const key = cacheKey(source, ids, startStr, endStr);
  const cached = readCache(key);
  if (cached) return cached;
  const existing = inflight.get(key);
  if (existing) return existing;
  const qs = new URLSearchParams({
    start: startStr,
    end: endStr,
    calendarIds: ids.join(","),
  });
  const promise = (async () => {
    try {
      const res = await fetch(`/api/${source}/events?${qs.toString()}`, { signal });
      if (!res.ok) return [];
      const list = (await res.json()) as CalendarEvent[];
      writeCache(key, list);
      return list;
    } catch {
      return [];
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

function prefetchAdjacent(
  source: CalendarSourceKey,
  ids: string[],
  startStr: string,
  endStr: string,
) {
  if (ids.length === 0) return;
  const { prev, next } = adjacentRanges(startStr, endStr);
  void fetchRange(source, ids, prev[0], prev[1]);
  void fetchRange(source, ids, next[0], next[1]);
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(id);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const id = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort);
  });
}

type Props = {
  view: CalendarDashView;
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
  const visibleRef = useRef(visibleCalendars);
  visibleRef.current = visibleCalendars;
  const [loading, setLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    refetch: () => {
      eventCache.clear();
      fcRef.current?.getApi().refetchEvents();
    },
    setView: (v) => fcRef.current?.getApi().changeView(VIEW_MAP[v]),
    today: () => fcRef.current?.getApi().today(),
    prev: () => fcRef.current?.getApi().prev(),
    next: () => fcRef.current?.getApi().next(),
    gotoDate: (date) => fcRef.current?.getApi().gotoDate(date),
  }));

  useEffect(() => {
    fcRef.current?.getApi().refetchEvents();
  }, [visibleCalendars]);

  useEffect(() => {
    const id = setInterval(() => {
      eventCache.clear();
      fcRef.current?.getApi().refetchEvents();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const makeSource = (source: CalendarSourceKey): EventSourceInput => ({
    id: source,
    events: async (info: EventSourceFuncArg): Promise<EventInput[]> => {
      if (!sourceConnected[source]) return [];
      const ids = Object.entries(visibleRef.current)
        .filter(([k, v]) => v && k.startsWith(`${source}:`))
        .map(([k]) => k.slice(source.length + 1));
      if (ids.length === 0) return [];

      const key = cacheKey(source, ids, info.startStr, info.endStr);
      const cached = readCache(key);
      if (cached) {
        prefetchAdjacent(source, ids, info.startStr, info.endStr);
        return cached.map(toFCEvent);
      }

      abortRegistry.get(source)?.abort();
      const controller = new AbortController();
      abortRegistry.set(source, controller);

      try {
        await abortableSleep(NAV_DEBOUNCE_MS, controller.signal);
        const list = await fetchRange(
          source,
          ids,
          info.startStr,
          info.endStr,
          controller.signal,
        );
        prefetchAdjacent(source, ids, info.startStr, info.endStr);
        return list.map(toFCEvent);
      } catch {
        return [];
      } finally {
        if (abortRegistry.get(source) === controller) {
          abortRegistry.delete(source);
        }
      }
    },
  });

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
        loading={setLoading}
        eventSources={[makeSource("google"), makeSource("outlook")]}
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
      {loading && (
        <div className="pointer-events-none absolute right-6 top-6 flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
          <Spinner />
          <span>Loading events…</span>
        </div>
      )}
    </div>
  );
});

export default CalendarView;

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-slate-500"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function toFCEvent(e: CalendarEvent) {
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
