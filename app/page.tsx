"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import CalendarView, {
  type ActiveRange,
  type CalendarDashView,
  type CalendarViewHandle,
  type CreateRange,
} from "@/components/CalendarView";
import EventModal, { type ModalState } from "@/components/EventModal";
import { visibilityKey } from "@/components/CalendarSourceList";
import { ymd } from "@/components/MiniCalendar";
import type {
  CalendarEvent,
  CalendarSourceKey,
  SubCalendar,
} from "@/types/calendar";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const calRef = useRef<CalendarViewHandle>(null);
  const [view, setView] = useState<CalendarDashView>("week");
  const [calendars, setCalendars] = useState<SubCalendar[]>([]);
  const [visibleCalendars, setVisibleCalendars] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState | null>(null);
  const [title, setTitle] = useState("");
  const [today] = useState<Date>(() => new Date());
  const [miniMonth, setMiniMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [activeRange, setActiveRange] = useState<ActiveRange | null>(null);
  const [miniEventDates, setMiniEventDates] = useState<Set<string>>(new Set());

  const googleConnected = !!session?.google?.accessToken && !session.google.error;
  const outlookConnected =
    !!session?.microsoft?.accessToken && !session.microsoft.error;
  const anyConnected = googleConnected || outlookConnected;

  const loadCalendars = useCallback(async () => {
    const next: SubCalendar[] = [];
    if (googleConnected) {
      try {
        const res = await fetch("/api/google/calendars");
        if (res.ok) next.push(...((await res.json()) as SubCalendar[]));
      } catch {}
    }
    if (outlookConnected) {
      try {
        const res = await fetch("/api/outlook/calendars");
        if (res.ok) next.push(...((await res.json()) as SubCalendar[]));
      } catch {}
    }
    setCalendars(next);
    setVisibleCalendars((prev) => {
      const out: Record<string, boolean> = {};
      for (const c of next) {
        const key = visibilityKey(c.source, c.id);
        out[key] = prev[key] ?? true;
      }
      return out;
    });
  }, [googleConnected, outlookConnected]);

  useEffect(() => {
    if (anyConnected) loadCalendars();
  }, [anyConnected, loadCalendars]);

  const visibleIdsBySource = useMemo(() => {
    const map: Record<CalendarSourceKey, string[]> = { google: [], outlook: [] };
    for (const c of calendars) {
      const key = visibilityKey(c.source, c.id);
      if (visibleCalendars[key]) map[c.source].push(c.id);
    }
    return map;
  }, [calendars, visibleCalendars]);

  useEffect(() => {
    if (!anyConnected) return;
    const ac = new AbortController();
    const gridStart = startOfMondayWeek(
      new Date(miniMonth.getFullYear(), miniMonth.getMonth(), 1),
    );
    const gridEnd = addDays(gridStart, 42);
    const start = gridStart.toISOString();
    const end = gridEnd.toISOString();

    const fetches: Promise<CalendarEvent[]>[] = [];
    if (googleConnected && visibleIdsBySource.google.length > 0) {
      fetches.push(
        fetchMiniEvents("google", start, end, visibleIdsBySource.google, ac.signal),
      );
    }
    if (outlookConnected && visibleIdsBySource.outlook.length > 0) {
      fetches.push(
        fetchMiniEvents("outlook", start, end, visibleIdsBySource.outlook, ac.signal),
      );
    }
    Promise.all(fetches)
      .then((lists) => {
        const set = new Set<string>();
        for (const list of lists) {
          for (const e of list) markRange(set, e);
        }
        setMiniEventDates(set);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [
    anyConnected,
    googleConnected,
    outlookConnected,
    miniMonth,
    visibleIdsBySource,
  ]);

  if (status === "loading") {
    return (
      <main className="flex h-screen items-center justify-center bg-white text-sm text-slate-500">
        Loading…
      </main>
    );
  }

  if (!anyConnected) {
    return <ConnectScreen />;
  }

  const handleViewChange = (v: CalendarDashView) => {
    setView(v);
    calRef.current?.setView(v);
  };

  const handleCreate = (range: CreateRange) =>
    setModal({ mode: "create", ...range });

  const handleEdit = (event: CalendarEvent) =>
    setModal({ mode: "edit", event });

  const handleMiniSelect = (date: Date) => {
    calRef.current?.gotoDate(date);
  };

  const handleToggleCalendar = (key: string) =>
    setVisibleCalendars((s) => ({ ...s, [key]: !(s[key] ?? true) }));

  return (
    <main className="flex h-screen flex-col bg-white text-slate-900">
      <Header
        view={view}
        onViewChange={handleViewChange}
        onToday={() => calRef.current?.today()}
        onPrev={() => calRef.current?.prev()}
        onNext={() => calRef.current?.next()}
        title={title}
      />
      {(!googleConnected || !outlookConnected) && (
        <ConnectBanner
          googleConnected={googleConnected}
          outlookConnected={outlookConnected}
        />
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          month={miniMonth}
          today={today}
          selectedStart={activeRange?.start ?? null}
          selectedEnd={activeRange?.end ?? null}
          eventDates={miniEventDates}
          onSelectDate={handleMiniSelect}
          onMonthChange={setMiniMonth}
          calendars={calendars}
          visible={visibleCalendars}
          onToggleCalendar={handleToggleCalendar}
        />
        <CalendarView
          ref={calRef}
          view={view}
          visibleCalendars={visibleCalendars}
          sourceConnected={{
            google: googleConnected,
            outlook: outlookConnected,
          }}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onTitleChange={setTitle}
          onRangeChange={setActiveRange}
        />
      </div>
      {modal && (
        <EventModal
          state={modal}
          calendars={calendars}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            miniEventCache.clear();
            setMiniMonth((m) => new Date(m));
            calRef.current?.refetch();
          }}
        />
      )}
    </main>
  );
}

const MINI_CACHE_TTL_MS = 5 * 60 * 1000;
const miniEventCache = new Map<string, { at: number; events: CalendarEvent[] }>();

async function fetchMiniEvents(
  source: CalendarSourceKey,
  start: string,
  end: string,
  calendarIds: string[],
  signal: AbortSignal,
): Promise<CalendarEvent[]> {
  const key = `${source}|${start.slice(0, 10)}|${end.slice(0, 10)}|${[...calendarIds].sort().join(",")}`;
  const hit = miniEventCache.get(key);
  if (hit && Date.now() - hit.at <= MINI_CACHE_TTL_MS) return hit.events;
  try {
    const qs = new URLSearchParams({
      start,
      end,
      calendarIds: calendarIds.join(","),
    });
    const res = await fetch(`/api/${source}/events?${qs.toString()}`, { signal });
    if (!res.ok) return [];
    const list = (await res.json()) as CalendarEvent[];
    miniEventCache.set(key, { at: Date.now(), events: list });
    return list;
  } catch {
    return [];
  }
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfMondayWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(d, offset);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function markRange(set: Set<string>, e: CalendarEvent) {
  const start = new Date(e.start);
  const end = new Date(e.end);
  const endDate = e.allDay ? addDays(end, -1) : end;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );
  while (cursor.getTime() <= last.getTime()) {
    set.add(ymd(cursor));
    cursor = addDays(cursor, 1);
  }
}

function ConnectScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header>
          <h1 className="text-2xl font-semibold text-slate-900">PandaCal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connect both calendars to see AG Barr and EFPT events in one view.
          </p>
        </header>
        <div className="space-y-3">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded-lg bg-orange-500 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
          >
            Connect Google Calendar (AG Barr)
          </button>
          <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-left text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            Connect Outlook Calendar (EFPT)
          </button>
        </div>
      </div>
    </main>
  );
}

function ConnectBanner({
  googleConnected,
  outlookConnected,
}: {
  googleConnected: boolean;
  outlookConnected: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 sm:px-6">
      <span>
        {!googleConnected && !outlookConnected
          ? "Connect a calendar to get started."
          : !googleConnected
          ? "AG Barr (Google) is not connected — events won't load."
          : "EFPT (Outlook) is not connected — events won't load."}
      </span>
      <div className="flex gap-2">
        {!googleConnected && (
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="rounded-md bg-orange-500 px-3 py-1 font-medium text-white hover:bg-orange-600"
          >
            Connect AG Barr
          </button>
        )}
        {!outlookConnected && (
          <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
            className="rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700"
          >
            Connect EFPT
          </button>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-600 hover:bg-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
