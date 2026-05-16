import { NextResponse } from "next/server";
import { normalizeCityCatalog } from "@/lib/cities";
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
    let next = value;
    if (key === "city_catalog") {
      next = normalizeCityCatalog(value);
    }
    await updateSetting(key, next);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
