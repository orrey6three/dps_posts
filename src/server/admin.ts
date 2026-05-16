import { supabaseAdmin } from "@/server/db";
import { HttpError } from "@/server/errors";

let cachedAdminRowId: string | null | undefined;

/** JWT может содержать id строкой «admin»; один раз резолвим в UUID строки users. */
export async function resolveAdminPostAuthorId(jwtUserId: string): Promise<string | null> {
  if (jwtUserId !== "admin") return jwtUserId;
  if (cachedAdminRowId !== undefined) return cachedAdminRowId;
  const { data } = await supabaseAdmin.from("users").select("id").eq("username", "admin").single();
  const resolved = data?.id ?? null;
  cachedAdminRowId = resolved;
  return resolved;
}

export async function getDashboardStats() {
  const [postsRes, usersRes, votesRes] = await Promise.all([
    supabaseAdmin.from("posts").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("votes").select("id", { count: "exact", head: true })
  ]);
  return {
    total_posts: postsRes.count ?? 0,
    total_users: usersRes.count ?? 0,
    total_votes: votesRes.count ?? 0
  };
}

export async function getUsers() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, role, created_at, is_shadowbanned, last_ip")
    .order("created_at", { ascending: false });
  if (error) throw new HttpError(500, "Не удалось загрузить пользователей");
  const users = data ?? [];
  if (users.length === 0) return [];

  const { data: postRows, error: postsErr } = await supabaseAdmin
    .from("posts")
    .select("user_id")
    .not("user_id", "is", null);
  if (postsErr) throw new HttpError(500, "Не удалось посчитать метки пользователей");

  const countByUser = new Map<string, number>();
  for (const row of postRows ?? []) {
    const uid = row.user_id as string;
    countByUser.set(uid, (countByUser.get(uid) ?? 0) + 1);
  }

  return users.map((user) => ({
    ...user,
    post_count: countByUser.get(user.id) ?? 0
  }));
}

export async function shadowbanUser(userId: string, isShadowbanned: boolean) {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ is_shadowbanned: isShadowbanned })
    .eq("id", userId);
  if (error) throw new HttpError(500, "Не удалось изменить статус бана");
}

export async function deleteUser(userId: string) {
  await supabaseAdmin.from("posts").update({ user_id: null }).eq("user_id", userId);
  const { error } = await supabaseAdmin.from("users").delete().eq("id", userId);
  if (error) throw new HttpError(500, "Не удалось удалить пользователя");
}

export async function getSettings() {
  const { data, error } = await supabaseAdmin.from("settings").select("*");
  if (error) throw new HttpError(500, "Не удалось загрузить настройки");
  return data ?? [];
}

export async function updateSetting(key: string, value: any) {
  const { error } = await supabaseAdmin
    .from("settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw new HttpError(500, "Не удалось обновить настройку");
}
