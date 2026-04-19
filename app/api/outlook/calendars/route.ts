import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { listOutlookCalendars } from "@/lib/outlook-calendar";

export async function GET() {
  const session = await getServerSession(authOptions);
  const tokens = session?.microsoft;
  if (!tokens?.accessToken || tokens.error) {
    return NextResponse.json(
      { error: "Not connected to Outlook Calendar" },
      { status: 401 },
    );
  }
  const calendars = await listOutlookCalendars(tokens.accessToken);
  return NextResponse.json(calendars);
}
