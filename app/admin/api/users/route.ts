import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import { getUsers } from "@/server/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return routeError(error);
  }
}
