import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { env } from "@/server/env";
import { HttpError } from "@/server/errors";
import { supabaseAdmin } from "@/server/db";
import type { AuthUser, JwtUser } from "@/types/models";

export const AUTH_COOKIE = "auth_token";
export const ADMIN_COOKIE = "admin_token";
const ONE_DAY = 24 * 60 * 60;

export function signToken(payload: JwtUser) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtUser;
  } catch {
    return null;
  }
}

export async function registerUser(username: string, password: string) {
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("username", username)
    .single();
  if (existing) throw new HttpError(400, "Пользователь с таким именем уже существует");

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert([{ username, password_hash, role: "user" }])
    .select("id, username, role, created_at")
    .single();
  if (error || !data) throw new HttpError(400, "Ошибка регистрации");
  return data as AuthUser;
}

export async function loginUser(username: string, password: string) {
  if (username === "admin" && password === env.adminPassword) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id, username, role")
      .eq("username", "admin")
      .single();
    if (data) return data as AuthUser;

    const { data: created, error } = await supabaseAdmin
      .from("users")
      .insert([{ username: "admin", password_hash: "LOCAL_ADMIN", role: "admin" }])
      .select("id, username, role")
      .single();
    if (error || !created) {
      throw new HttpError(500, "Не удалось создать пользователя администратора");
    }
    return created as AuthUser;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, role, password_hash")
    .eq("username", username)
    .single();
  if (error || !data) throw new HttpError(401, "Неверное имя пользователя или пароль");

  const ok = await bcrypt.compare(password, data.password_hash);
  if (!ok) throw new HttpError(401, "Неверное имя пользователя или пароль");
  return { id: data.id, username: data.username, role: data.role } as AuthUser;
}

export async function setSessionCookies(user: AuthUser) {
  const store = await cookies();
  const token = signToken({ id: user.id, username: user.username, role: user.role });
  const base = {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "strict" as const,
    path: "/",
    maxAge: ONE_DAY
  };
  if (user.role === "admin") {
    store.set(ADMIN_COOKIE, token, base);
  } else {
    store.set(AUTH_COOKIE, token, base);
  }
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  store.delete(ADMIN_COOKIE);
}
