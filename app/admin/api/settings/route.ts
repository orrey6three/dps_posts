import { NextResponse } from "next/server";
import { getSettings, updateSetting } from "@/server/admin";
import { routeError } from "@/server/errors";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { key, value } = await request.json();
    await updateSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
