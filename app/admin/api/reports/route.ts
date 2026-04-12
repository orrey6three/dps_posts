import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { getReports } from "@/server/reports";
import { routeError } from "@/server/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const reports = await getReports();
    return NextResponse.json({ reports });
  } catch (error) {
    return routeError(error);
  }
}
