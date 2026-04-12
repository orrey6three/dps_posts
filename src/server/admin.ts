import { supabaseAdmin } from "@/server/db";
import { HttpError } from "@/server/errors";

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
    .select("id, username, role, created_at, is_shadowbanned")
    .order("created_at", { ascending: false });
  if (error) throw new HttpError(500, "Не удалось загрузить пользователей");
  const users = data ?? [];
  return Promise.all(
    users.map(async (user) => {
      const { count } = await supabaseAdmin
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return { ...user, post_count: count ?? 0 };
    })
  );
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
