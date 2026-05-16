import { NextRequest, NextResponse } from "next/server";
import { loginUser, setSessionCookies } from "@/server/auth";
import { routeError } from "@/server/errors";
import { getClientIp } from "@/server/requestIp";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Имя пользователя и пароль обязательны" }, { status: 400 });
    }
    const ip = getClientIp(request);
    const user = await loginUser(username, password, ip ?? undefined);
    await setSessionCookies(user);
    return NextResponse.json({ success: true, user, message: "Вход выполнен" });
  } catch (error) {
    return routeError(error);
  }
}
