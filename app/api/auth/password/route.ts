import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/server/auth";
import { routeError } from "@/server/errors";
import { requireUser } from "@/server/session";

export async function POST(request: NextRequest) {
  try {
    const jwt = requireUser(request);
    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Укажите текущий и новый пароль" }, { status: 400 });
    }
    await changePassword(jwt.id, currentPassword, newPassword);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
