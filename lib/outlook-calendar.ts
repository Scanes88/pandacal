import { Client } from "@microsoft/microsoft-graph-client";
import {
  getCalendarColour,
  type CalendarEvent,
  type EventInput,
  type SubCalendar,
} from "@/types/calendar";

type GraphDateTime = { dateTime: string; timeZone: string };

type GraphEvent = {
  id: string;
  subject?: string | null;
  body?: { content?: string; contentType?: string } | null;
  start: GraphDateTime;
  end: GraphDateTime;
  isAllDay: boolean;
  location?: { displayName?: string } | null;
};

type GraphCalendar = {
  id: string;
  name?: string | null;
  isDefaultCalendar?: boolean;
};

function client(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

function toIso(dt: GraphDateTime): string {
  return dt.dateTime.endsWith("Z") ? dt.dateTime : `${dt.dateTime}Z`;
}

function toUnified(
  e: GraphEvent,
  calendarId: string,
  calendarName: string,
): CalendarEvent {
  return {
    id: `outlook:${calendarId}:${e.id}`,
    sourceId: e.id,
    source: "outlook",
    calendarId,
    title: e.subject ?? "(no title)",
    description: e.body?.content ?? undefined,
    start: toIso(e.start),
    end: toIso(e.end),
    allDay: !!e.isAllDay,
    location: e.location?.displayName ?? undefined,
    colour: getCalendarColour("outlook", calendarName),
    calendarName,
  };
}

function toGraphEvent(input: EventInput) {
  return {
    subject: input.title,
    body: input.description
      ? { contentType: "text", content: input.description }
      : undefined,
    start: { dateTime: input.start, timeZone: "UTC" },
    end: { dateTime: input.end, timeZone: "UTC" },
    isAllDay: !!input.allDay,
    location: input.location ? { displayName: input.location } : undefined,
  };
}

const SELECT = "id,subject,body,start,end,isAllDay,location";

export async function listOutlookCalendars(
  accessToken: string,
): Promise<SubCalendar[]> {
  const graph = client(accessToken);
  const res = await graph
    .api("/me/calendars")
    .select("id,name,isDefaultCalendar")
    .top(250)
    .get();
  return (res.value as GraphCalendar[]).map((c) => ({
    id: c.id,
    source: "outlook" as const,
    name: c.name ?? "Calendar",
    primary: !!c.isDefaultCalendar,
  }));
}

export async function listOutlookEvents(
  accessToken: string,
  startDateTime: string,
  endDateTime: string,
  calendars: { id: string; name: string }[],
): Promise<CalendarEvent[]> {
  const graph = client(accessToken);
  const results = await Promise.all(
    calendars.map(async ({ id, name }) => {
      try {
        const res = await graph
          .api(`/me/calendars/${id}/calendarView`)
          .query({ startDateTime, endDateTime })
          .header("Prefer", 'outlook.timezone="UTC"')
          .select(SELECT)
          .top(250)
          .get();
        return (res.value as GraphEvent[]).map((e) => toUnified(e, id, name));
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}

export async function createOutlookEvent(
  accessToken: string,
  calendarId: string,
  calendarName: string,
  input: EventInput,
): Promise<CalendarEvent> {
  const graph = client(accessToken);
  const res = (await graph
    .api(`/me/calendars/${calendarId}/events`)
    .post(toGraphEvent(input))) as GraphEvent;
  return toUnified(res, calendarId, calendarName);
}

export async function updateOutlookEvent(
  accessToken: string,
  calendarId: string,
  calendarName: string,
  sourceId: string,
  input: EventInput,
): Promise<CalendarEvent> {
  const graph = client(accessToken);
  const res = (await graph
    .api(`/me/events/${sourceId}`)
    .patch(toGraphEvent(input))) as GraphEvent;
  return toUnified(res, calendarId, calendarName);
}

export async function deleteOutlookEvent(
  accessToken: string,
  sourceId: string,
): Promise<void> {
  const graph = client(accessToken);
  await graph.api(`/me/events/${sourceId}`).delete();
}
