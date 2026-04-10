import { NextRequest, NextResponse } from "next/server";
import { createPatrolFromBot } from "@/server/bot";
import { routeError } from "@/server/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token =
      request.headers.get("x-bot-token") ?? body.token ?? request.nextUrl.searchParams.get("token");
    const result = await createPatrolFromBot(body, token);
    if (result.mode === "static") {
      return NextResponse.json({
        success: true,
        message: "Статичный пост обновлён через голосование",
        post: result.post
      });
    }
    return NextResponse.json({ success: true, post: result.post }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
