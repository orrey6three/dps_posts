import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/session";
import { routeError } from "@/server/errors";
import { deleteUser } from "@/server/admin";

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
