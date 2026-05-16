import type { NextRequest } from "next/server";

/** IP клиента из прокси-заголовков (NextRequest.ip в App Router не типизируется). */
export function getClientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return undefined;
}
