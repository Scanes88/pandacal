"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SOURCE_ACCOUNT_NAMES,
  type CalendarEvent,
  type EventInput,
  type SubCalendar,
} from "@/types/calendar";

export type ModalState =
  | { mode: "create"; start: string; end: string; allDay: boolean }
  | { mode: "edit"; event: CalendarEvent };

type Props = {
  state: ModalState;
  calendars: SubCalendar[];
  onClose: () => void;
  onSaved: () => void;
};

export default function EventModal({ state, calendars, onClose, onSaved }: Props) {
  const isEdit = state.mode === "edit";

  const initial: EventInput = isEdit
    ? {
        title: state.event.title,
        description: state.event.description ?? "",
        start: state.event.start,
        end: state.event.end,
        allDay: state.event.allDay,
        location: state.event.location ?? "",
      }
    : {
        title: "",
        description: "",
        start: state.start,
        end: state.end,
        allDay: state.allDay,
        location: "",
      };

  const defaultKey = useMemo(() => {
    if (isEdit) return `${state.event.source}:${state.event.calendarId}`;
    const preferred =
      calendars.find((c) => c.source === "google" && c.primary) ??
      calendars.find((c) => c.primary) ??
      calendars[0];
    return preferred ? `${preferred.source}:${preferred.id}` : "";
  }, [isEdit, state, calendars]);

  const [form, setForm] = useState<EventInput>(initial);
  const [calKey, setCalKey] = useState<string>(defaultKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const [source, calendarId] = calKey ? calKey.split(/:(.+)/) : ["", ""];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!source || !calendarId) {
      setError("Pick a calendar");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const path = `/api/${source}/events`;
      const res = isEdit
        ? await fetch(path, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...form,
              sourceId: state.event.sourceId,
              calendarId: state.event.calendarId,
            }),
          })
        : await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, calendarId }),
          });
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!window.confirm("Delete this event?")) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sourceId: state.event.sourceId,
        calendarId: state.event.calendarId,
      });
      const url = `/api/${state.event.source}/events?${params.toString()}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Delete failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const inputType = form.allDay ? "date" : "datetime-local";
  const trim = (s: string) => (form.allDay ? s.slice(0, 10) : s.slice(0, 16));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit event" : "New event"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <Field label="Title">
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input"
            autoFocus
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={!!form.allDay}
            onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          All day
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <input
              type={inputType}
              required
              value={trim(form.start)}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="End">
            <input
              type={inputType}
              required
              value={trim(form.end)}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        <Field label="Location">
          <input
            value={form.location ?? ""}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={3}
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input resize-none"
          />
        </Field>

        <Field label="Calendar">
          <select
            disabled={isEdit}
            value={calKey}
            onChange={(e) => setCalKey(e.target.value)}
            className="input"
          >
            {isEdit && (
              <option value={calKey}>
                {SOURCE_ACCOUNT_NAMES[state.event.source]} — {state.event.calendarName}
              </option>
            )}
            {!isEdit &&
              calendars.map((c) => (
                <option key={`${c.source}:${c.id}`} value={`${c.source}:${c.id}`}>
                  {SOURCE_ACCOUNT_NAMES[c.source]} — {c.name}
                </option>
              ))}
          </select>
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                source === "google"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
