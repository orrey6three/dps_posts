import { NextRequest, NextResponse } from "next/server";
import { registerUser, setSessionCookies } from "@/server/auth";
import { routeError } from "@/server/errors";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Имя пользователя и пароль обязательны" }, { status: 400 });
    }
    const user = await registerUser(username, password);
    await setSessionCookies(user);
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
