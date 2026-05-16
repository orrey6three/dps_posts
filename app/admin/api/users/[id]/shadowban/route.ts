import { NextResponse } from "next/server";
import { shadowbanUser } from "@/server/admin";
import { routeError } from "@/server/errors";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { isShadowbanned } = await request.json();
    await shadowbanUser(params.id, isShadowbanned);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
