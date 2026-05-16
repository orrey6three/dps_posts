import { HttpError } from "@/server/errors";
import { supabaseAdmin } from "@/server/db";
import { getUserPublicStats } from "@/server/userStats";
import type { AuthUser, UserPublicStats } from "@/types/models";

type UserRow = {
  id: string;
  username: string;
  role: string;
  created_at?: string;
  is_shadowbanned?: boolean | null;
  subscription_until?: string | null;
  avatar_url?: string | null;
};

async function fetchUserRow(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, username, role, created_at, is_shadowbanned, subscription_until, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // Fallback in case of migration/missing columns (old style but safer)
    const { data: fallback, error: fe } = await supabaseAdmin
      .from("users")
      .select("id, username, role, created_at, is_shadowbanned")
      .eq("id", userId)
      .maybeSingle();
    if (fe || !fallback) return null;
    return { ...(fallback as unknown as UserRow), subscription_until: null, avatar_url: null };
  }
  return data as unknown as UserRow;
}

export async function fetchSessionUserProfile(userId: string): Promise<{
  user: AuthUser;
  stats: UserPublicStats;
}> {
  if (!userId) throw new HttpError(401, "Требуется авторизация");

  const [row, stats] = await Promise.all([
    fetchUserRow(userId),
    getUserPublicStats(userId)
  ]);

  if (!row) throw new HttpError(401, "Сессия устарела — войдите снова");

  return {
    user: {
      id: row.id,
      username: row.username,
      role: row.role as AuthUser["role"],
      created_at: row.created_at,
      is_shadowbanned: row.is_shadowbanned ?? undefined,
      subscription_until: row.subscription_until ?? null,
      avatar_url: row.avatar_url ?? null
    },
    stats
  };
}
