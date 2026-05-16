import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { shadowbanUser } from "@/server/admin";
import { routeError } from "@/server/errors";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { isShadowbanned } = await request.json();
    await shadowbanUser(id, isShadowbanned);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
