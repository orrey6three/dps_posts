import { NextRequest, NextResponse } from "next/server";
import { removeUserAvatar, uploadUserAvatar } from "@/server/userAvatar";
import { routeError } from "@/server/errors";
import { requireUser } from "@/server/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const jwt = requireUser(request);
    const form = await request.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) {
      return NextResponse.json({ error: "Нужен файл в поле file" }, { status: 400 });
    }
    const buf = new Uint8Array(await entry.arrayBuffer());
    const url = await uploadUserAvatar(jwt.id, buf);
    return NextResponse.json({ success: true, avatar_url: url });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const jwt = requireUser(request);
    await removeUserAvatar(jwt.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
