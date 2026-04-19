import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  listGoogleCalendars,
  listGoogleEvents,
  updateGoogleEvent,
} from "@/lib/google-calendar";
import type { EventInput, SubCalendar } from "@/types/calendar";

async function getAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const tokens = session?.google;
  if (!tokens?.accessToken || tokens.error) return null;
  return tokens.accessToken;
}

function unauthorized() {
  return NextResponse.json(
    { error: "Not connected to Google Calendar" },
    { status: 401 },
  );
}

async function resolveCalendar(
  accessToken: string,
  calendarId: string | null,
): Promise<SubCalendar | null> {
  const list = await listGoogleCalendars(accessToken);
  if (calendarId) return list.find((c) => c.id === calendarId) ?? null;
  return list.find((c) => c.primary) ?? list[0] ?? null;
}

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return unauthorized();

  const url = new URL(req.url);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params are required (ISO-8601)" },
      { status: 400 },
    );
  }

  const all = await listGoogleCalendars(accessToken);
  const idsParam = url.searchParams.get("calendarIds");
  const ids = idsParam ? new Set(idsParam.split(",").filter(Boolean)) : null;
  const chosen = ids ? all.filter((c) => ids.has(c.id)) : all;
  const events = await listGoogleEvents(
    accessToken,
    start,
    end,
    chosen.map((c) => ({ id: c.id, name: c.name })),
  );
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return unauthorized();

  const body = (await req.json()) as EventInput & { calendarId?: string };
  const { calendarId, ...input } = body;
  const cal = await resolveCalendar(accessToken, calendarId ?? null);
  if (!cal) {
    return NextResponse.json({ error: "No calendar available" }, { status: 400 });
  }
  const event = await createGoogleEvent(accessToken, cal.id, cal.name, input);
  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return unauthorized();

  const body = (await req.json()) as EventInput & {
    sourceId: string;
    calendarId?: string;
  };
  const { sourceId, calendarId, ...input } = body;
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }
  const cal = await resolveCalendar(accessToken, calendarId ?? null);
  if (!cal) {
    return NextResponse.json({ error: "No calendar available" }, { status: 400 });
  }
  const event = await updateGoogleEvent(
    accessToken,
    cal.id,
    cal.name,
    sourceId,
    input,
  );
  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) return unauthorized();

  const url = new URL(req.url);
  const sourceId = url.searchParams.get("sourceId");
  const calendarId = url.searchParams.get("calendarId");
  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }
  const cal = await resolveCalendar(accessToken, calendarId);
  if (!cal) {
    return NextResponse.json({ error: "No calendar available" }, { status: 400 });
  }
  await deleteGoogleEvent(accessToken, cal.id, sourceId);
  return new NextResponse(null, { status: 204 });
}
