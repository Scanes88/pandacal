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
import { useEventStore } from "@/lib/use-event-store";
import type { CalendarEvent, SubCalendar } from "@/types/calendar";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const calRef = useRef<CalendarViewHandle>(null);
  const [view, setView] = useState<CalendarDashView>("week");
  const [calendars, setCalendars] = useState<SubCalendar[]>([]);
  const [calendarsLoaded, setCalendarsLoaded] = useState(false);
  const [visibleCalendars, setVisibleCalendars] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState | null>(null);
  const [title, setTitle] = useState("");
  const [today] = useState<Date>(() => new Date());
  const [miniMonth, setMiniMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [activeRange, setActiveRange] = useState<ActiveRange | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    setCalendarsLoaded(true);
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

  const { events, loading: eventsLoading, ensureRange, refresh } = useEventStore({
    calendars,
    googleConnected,
    outlookConnected,
  });

  const visibleEvents = useMemo(() => {
    return events.filter(
      (e) => visibleCalendars[visibilityKey(e.source, e.calendarId)] ?? true,
    );
  }, [events, visibleCalendars]);

  const miniEventDates = useMemo(() => {
    const set = new Set<string>();
    for (const e of visibleEvents) markRange(set, e);
    return set;
  }, [visibleEvents]);

  const handleRangeChange = useCallback(
    (range: ActiveRange) => {
      setActiveRange(range);
      ensureRange(range.start, range.end);
    },
    [ensureRange],
  );

  if (status === "loading") {
    return <SplashScreen message="Loading…" />;
  }

  if (!anyConnected) {
    return <ConnectScreen />;
  }

  const showInitialLoading =
    anyConnected && (!calendarsLoaded || (calendars.length > 0 && eventsLoading));

  if (showInitialLoading) {
    return <SplashScreen message="Loading your calendars…" spinner />;
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
    setSidebarOpen(false);
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
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
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
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <CalendarView
          ref={calRef}
          view={view}
          events={events}
          visibleCalendars={visibleCalendars}
          sourceConnected={{
            google: googleConnected,
            outlook: outlookConnected,
          }}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onTitleChange={setTitle}
          onRangeChange={handleRangeChange}
        />
      </div>
      {modal && (
        <EventModal
          state={modal}
          calendars={calendars}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
    </main>
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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

function SplashScreen({
  message,
  spinner = false,
}: {
  message: string;
  spinner?: boolean;
}) {
  return (
    <main className="flex h-screen items-center justify-center bg-white">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        {spinner && <Spinner />}
        <span>{message}</span>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-slate-500"
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
