import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    return NextResponse.json({ success: true, admin: true });
  } catch (error) {
    return routeError(error);
  }
}
