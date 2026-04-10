import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/server/admin";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    return routeError(error);
  }
}
