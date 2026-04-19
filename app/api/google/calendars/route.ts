import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { listGoogleCalendars } from "@/lib/google-calendar";

export async function GET() {
  const session = await getServerSession(authOptions);
  const tokens = session?.google;
  if (!tokens?.accessToken || tokens.error) {
    return NextResponse.json(
      { error: "Not connected to Google Calendar" },
      { status: 401 },
    );
  }
  const calendars = await listGoogleCalendars(tokens.accessToken);
  return NextResponse.json(calendars);
}
