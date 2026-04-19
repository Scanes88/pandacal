export type CalendarSourceKey = "google" | "outlook";

export interface CalendarEvent {
  id: string;
  sourceId: string;
  source: CalendarSourceKey;
  calendarId: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  colour: string;
  calendarName: string;
}

export interface EventInput {
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  location?: string;
}

export interface SubCalendar {
  id: string;
  source: CalendarSourceKey;
  name: string;
  primary: boolean;
}

export const SOURCE_COLOURS = {
  google: "#F97316",
  outlook: "#3B82F6",
} as const;

export const SOURCE_ACCOUNT_NAMES = {
  google: "AG Barr",
  outlook: "EFPT",
} as const;

const CALENDAR_NAME_COLOURS: Record<string, string> = {
  "Ruth Buscombe": "#C4B5FD",
  "Brad & Ruth": "#86EFAC",
};

export function getCalendarColour(
  source: CalendarSourceKey,
  calendarName: string,
): string {
  return CALENDAR_NAME_COLOURS[calendarName] ?? SOURCE_COLOURS[source];
}
