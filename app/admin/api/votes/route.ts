import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import { deleteAllVotes } from "@/server/votes";

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    await deleteAllVotes();
    return NextResponse.json({ success: true, message: "Все голоса удалены" });
  } catch (error) {
    return routeError(error);
  }
}
