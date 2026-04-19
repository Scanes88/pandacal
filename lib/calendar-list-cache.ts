import { listGoogleCalendars } from "@/lib/google-calendar";
import { listOutlookCalendars } from "@/lib/outlook-calendar";
import type { CalendarSourceKey, SubCalendar } from "@/types/calendar";

const TTL_MS = 5 * 60 * 1000;

type Entry = { expiresAt: number; promise: Promise<SubCalendar[]> };

const cache = new Map<string, Entry>();

function key(source: CalendarSourceKey, accessToken: string): string {
  return `${source}|${accessToken}`;
}

function getCached(
  source: CalendarSourceKey,
  accessToken: string,
  loader: () => Promise<SubCalendar[]>,
): Promise<SubCalendar[]> {
  const k = key(source, accessToken);
  const now = Date.now();
  const hit = cache.get(k);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = loader().catch((err) => {
    if (cache.get(k)?.promise === promise) cache.delete(k);
    throw err;
  });
  cache.set(k, { expiresAt: now + TTL_MS, promise });
  return promise;
}

export function getGoogleCalendarsCached(
  accessToken: string,
): Promise<SubCalendar[]> {
  return getCached("google", accessToken, () => listGoogleCalendars(accessToken));
}

export function getOutlookCalendarsCached(
  accessToken: string,
): Promise<SubCalendar[]> {
  return getCached("outlook", accessToken, () => listOutlookCalendars(accessToken));
}
