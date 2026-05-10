import { NextRequest, NextResponse } from "next/server";
import { runScheduledVotesCleanup } from "@/server/jobs/scheduledVotesCleanup";
import { HttpError, routeError } from "@/server/errors";

export const dynamic = "force-dynamic";

/** Раз в сутки очистка голосов; дергается Vercel Cron (GET) или вручную с секретом. */
export const maxDuration = 120;

function verifyCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new HttpError(503, "CRON_SECRET не задан в окружении");
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  const headerSecret = request.headers.get("x-cron-secret");

  if (bearer === expected || headerSecret === expected) return;

  throw new HttpError(401, "Неверный ключ расписания");
}

export async function GET(request: NextRequest) {
  try {
    verifyCronSecret(request);
    await runScheduledVotesCleanup();
    return NextResponse.json({
      ok: true,
      job: "votes-cleanup",
      at: new Date().toISOString()
    });
  } catch (error) {
    return routeError(error);
  }
}
