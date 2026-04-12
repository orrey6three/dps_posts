import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/server/session";
import { createReport } from "@/server/reports";
import { routeError } from "@/server/errors";

export async function POST(request: NextRequest) {
  try {
    const user = getRequestUser(request);
    const body = await request.json();
    const { postId, reason } = body;

    if (!postId || !reason) {
      return NextResponse.json({ error: "postId and reason are required" }, { status: 400 });
    }

    const report = await createReport(postId, user?.id ?? null, reason);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    return routeError(error);
  }
}
