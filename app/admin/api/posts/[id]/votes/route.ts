import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import { deleteVotesForPost } from "@/server/votes";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    requireAdmin(_request);
    const { id } = await params;
    await deleteVotesForPost(id);
    return NextResponse.json({ success: true, message: "Голоса по метке удалены" });
  } catch (error) {
    return routeError(error);
  }
}
