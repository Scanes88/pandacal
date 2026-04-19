import { google, type calendar_v3 } from "googleapis";
import {
  getCalendarColour,
  type CalendarEvent,
  type EventInput,
  type SubCalendar,
} from "@/types/calendar";

function client(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

function toUnified(
  e: calendar_v3.Schema$Event,
  calendarId: string,
  calendarName: string,
): CalendarEvent {
  const allDay = !!e.start?.date;
  const start = (e.start?.dateTime ?? e.start?.date)!;
  const end = (e.end?.dateTime ?? e.end?.date)!;
  return {
    id: `google:${calendarId}:${e.id}`,
    sourceId: e.id!,
    source: "google",
    calendarId,
    title: e.summary ?? "(no title)",
    description: e.description ?? undefined,
    start,
    end,
    allDay,
    location: e.location ?? undefined,
    colour: getCalendarColour("google", calendarName),
    calendarName,
  };
}

function toGoogleEvent(input: EventInput): calendar_v3.Schema$Event {
  const isAllDay = !!input.allDay;
  return {
    summary: input.title,
    description: input.description,
    location: input.location,
    start: isAllDay
      ? { date: input.start.slice(0, 10) }
      : { dateTime: input.start },
    end: isAllDay
      ? { date: input.end.slice(0, 10) }
      : { dateTime: input.end },
  };
}

export async function listGoogleCalendars(
  accessToken: string,
): Promise<SubCalendar[]> {
  const cal = client(accessToken);
  const res = await cal.calendarList.list({ maxResults: 250, minAccessRole: "reader" });
  return (res.data.items ?? [])
    .filter((c) => c.id)
    .map((c) => ({
      id: c.id!,
      source: "google" as const,
      name: c.summaryOverride ?? c.summary ?? c.id!,
      primary: !!c.primary,
    }));
}

const GOOGLE_EVENT_FIELDS =
  "items(id,summary,description,location,start,end),nextPageToken";

export async function listGoogleEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendars: { id: string; name: string }[],
): Promise<CalendarEvent[]> {
  const cal = client(accessToken);
  const results = await Promise.all(
    calendars.map(async ({ id, name }) => {
      try {
        const res = await cal.events.list({
          calendarId: id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 250,
          fields: GOOGLE_EVENT_FIELDS,
        });
        return (res.data.items ?? []).map((e) => toUnified(e, id, name));
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  calendarName: string,
  input: EventInput,
): Promise<CalendarEvent> {
  const cal = client(accessToken);
  const res = await cal.events.insert({
    calendarId,
    requestBody: toGoogleEvent(input),
  });
  return toUnified(res.data, calendarId, calendarName);
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  calendarName: string,
  sourceId: string,
  input: EventInput,
): Promise<CalendarEvent> {
  const cal = client(accessToken);
  const res = await cal.events.update({
    calendarId,
    eventId: sourceId,
    requestBody: toGoogleEvent(input),
  });
  return toUnified(res.data, calendarId, calendarName);
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  sourceId: string,
): Promise<void> {
  const cal = client(accessToken);
  await cal.events.delete({ calendarId, eventId: sourceId });
}
