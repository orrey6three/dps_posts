import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import { deleteUser, shadowbanUser } from "@/server/admin";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAdmin(request);
    const { id } = await params;
    await deleteUser(id);
    return NextResponse.json({ success: true, message: "Пользователь удалён" });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { is_shadowbanned } = body;
    await shadowbanUser(id, !!is_shadowbanned);
    return NextResponse.json({ success: true, message: "Статус бана обновлён" });
  } catch (error) {
    return routeError(error);
  }
}
