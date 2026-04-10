import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/session";
import { routeError } from "@/server/errors";

export async function GET(request: NextRequest) {
  try {
    const user = requireUser(request);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return routeError(error);
  }
}
