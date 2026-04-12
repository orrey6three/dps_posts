import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { updateReportStatus } from "@/server/reports";
import { routeError } from "@/server/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { status } = body;
    const report = await updateReportStatus(id, status);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    return routeError(error);
  }
}
