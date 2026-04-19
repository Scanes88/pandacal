import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getGoogleCalendarsCached } from "@/lib/calendar-list-cache";

export async function GET() {
  const session = await getServerSession(authOptions);
  const tokens = session?.google;
  if (!tokens?.accessToken || tokens.error) {
    return NextResponse.json(
      { error: "Not connected to Google Calendar" },
      { status: 401 },
    );
  }
  const calendars = await getGoogleCalendarsCached(tokens.accessToken);
  return NextResponse.json(calendars);
}
