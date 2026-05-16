import type { UserPublicStats } from "@/types/models";
import { supabaseAdmin } from "@/server/db";
import { HttpError } from "@/server/errors";

function computeReputation(posts: number, relevantVotes: number): number {
  return posts * 5 + relevantVotes * 2;
}

function computeLevel(reputation: number): number {
  return Math.min(99, Math.max(1, Math.floor(reputation / 25) + 1));
}

export async function getUserPublicStats(userId: string): Promise<UserPublicStats> {
  // Fetch both the count of posts and the list of post IDs in parallel
  const [postsRes, idsRes] = await Promise.all([
    supabaseAdmin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabaseAdmin
      .from("posts")
      .select("id")
      .eq("user_id", userId)
  ]);

  if (postsRes.error || idsRes.error) {
    throw new HttpError(500, "Не удалось загрузить статистику пользователя");
  }

  const posts = postsRes.count ?? 0;
  const ids = (idsRes.data ?? []).map((r) => r.id as string);
  
  let relevantVotes = 0;
  if (ids.length) {
    const { count, error } = await supabaseAdmin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .in("post_id", ids)
      .eq("vote_type", "relevant");
    
    if (error) throw new HttpError(500, "Не удалось загрузить голоса");
    relevantVotes = count ?? 0;
  }

  const reputation = computeReputation(posts, relevantVotes);
  return {
    posts_created: posts,
    relevant_votes_received: relevantVotes,
    reputation,
    level: computeLevel(reputation)
  };
}
