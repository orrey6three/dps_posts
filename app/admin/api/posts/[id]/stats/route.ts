import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import { getPostVoteStats } from "@/server/votes";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const stats = await getPostVoteStats(id);
    return NextResponse.json({ stats });
  } catch (error) {
    return routeError(error);
  }
}
