import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, AUTH_COOKIE, verifyToken } from "@/server/auth";
import { HttpError } from "@/server/errors";
import type { JwtUser } from "@/types/models";

export function getRequestUser(request: NextRequest): JwtUser | null {
  const token =
    request.cookies.get(AUTH_COOKIE)?.value ?? request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function requireUser(request: NextRequest) {
  const user = getRequestUser(request);
  if (!user) throw new HttpError(401, "Требуется авторизация");
  return user;
}

export function requireAdmin(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) throw new HttpError(401, "Требуется авторизация администратора");
  const user = verifyToken(token);
  if (!user || user.role !== "admin") throw new HttpError(403, "Отказано в доступе");
  return user;
}
