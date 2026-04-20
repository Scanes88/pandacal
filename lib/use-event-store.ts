"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CalendarEvent,
  CalendarSourceKey,
  SubCalendar,
} from "@/types/calendar";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const EXTEND_BUFFER_MONTHS = 6;

export type EventWindow = { start: Date; end: Date };

function initialWindow(): EventWindow {
  const now = new Date();
  const year = now.getFullYear();
  return {
    start: new Date(year, 0, 1),
    end: new Date(year + 1, 0, 1),
  };
}

async function fetchSource(
  source: CalendarSourceKey,
  ids: string[],
  window: EventWindow,
  signal: AbortSignal,
): Promise<CalendarEvent[]> {
  if (ids.length === 0) return [];
  const qs = new URLSearchParams({
    start: window.start.toISOString(),
    end: window.end.toISOString(),
    calendarIds: ids.join(","),
  });
  const res = await fetch(`/api/${source}/events?${qs.toString()}`, { signal });
  if (!res.ok) return [];
  return (await res.json()) as CalendarEvent[];
}

type Params = {
  calendars: SubCalendar[];
  googleConnected: boolean;
  outlookConnected: boolean;
};

export type EventStore = {
  events: CalendarEvent[];
  loading: boolean;
  ensureRange: (start: Date, end: Date) => void;
  refresh: () => void;
};

export function useEventStore({
  calendars,
  googleConnected,
  outlookConnected,
}: Params): EventStore {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [window, setWindow] = useState<EventWindow>(() => initialWindow());
  const [initialLoaded, setInitialLoaded] = useState(false);

  const calendarsRef = useRef(calendars);
  calendarsRef.current = calendars;
  const connectedRef = useRef({ google: googleConnected, outlook: outlookConnected });
  connectedRef.current = { google: googleConnected, outlook: outlookConnected };
  const windowRef = useRef(window);
  windowRef.current = window;
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async (nextWindow: EventWindow) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const cals = calendarsRef.current;
    const googleIds = connectedRef.current.google
      ? cals.filter((c) => c.source === "google").map((c) => c.id)
      : [];
    const outlookIds = connectedRef.current.outlook
      ? cals.filter((c) => c.source === "outlook").map((c) => c.id)
      : [];

    try {
      const [g, o] = await Promise.all([
        fetchSource("google", googleIds, nextWindow, controller.signal),
        fetchSource("outlook", outlookIds, nextWindow, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setEvents([...g, ...o]);
      setWindow(nextWindow);
      setInitialLoaded(true);
    } catch {
      // ignore aborts and network failures; background refresh will retry
    }
  }, []);

  const calendarsKey = calendars
    .map((c) => `${c.source}:${c.id}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (!googleConnected && !outlookConnected) return;
    if (calendars.length === 0) return;
    void runFetch(windowRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarsKey, googleConnected, outlookConnected, runFetch]);

  useEffect(() => {
    if (!initialLoaded) return;
    const id = setInterval(() => {
      void runFetch(windowRef.current);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [initialLoaded, runFetch]);

  const ensureRange = useCallback(
    (start: Date, end: Date) => {
      const w = windowRef.current;
      if (start >= w.start && end <= w.end) return;
      const newStart =
        start < w.start
          ? new Date(start.getFullYear(), start.getMonth() - EXTEND_BUFFER_MONTHS, 1)
          : w.start;
      const newEnd =
        end > w.end
          ? new Date(end.getFullYear(), end.getMonth() + EXTEND_BUFFER_MONTHS + 1, 1)
          : w.end;
      void runFetch({ start: newStart, end: newEnd });
    },
    [runFetch],
  );

  const refresh = useCallback(() => {
    void runFetch(windowRef.current);
  }, [runFetch]);

  return { events, loading: !initialLoaded, ensureRange, refresh };
}
