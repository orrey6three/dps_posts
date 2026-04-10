import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/server/auth";
import { routeError } from "@/server/errors";

export async function POST() {
  try {
    await clearSessionCookies();
    return NextResponse.json({ success: true, message: "Выход выполнен" });
  } catch (error) {
    return routeError(error);
  }
}
