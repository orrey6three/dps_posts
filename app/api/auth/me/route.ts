import { NextRequest, NextResponse } from "next/server";
import { fetchSessionUserProfile } from "@/server/userProfile";
import { routeError } from "@/server/errors";
import { requireUser } from "@/server/session";

export async function GET(request: NextRequest) {
  try {
    const jwt = requireUser(request);
    const { user, stats } = await fetchSessionUserProfile(jwt.id);
    return NextResponse.json({ success: true, user, stats });
  } catch (error) {
    return routeError(error);
  }
}
