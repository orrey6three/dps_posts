import { supabase, supabaseAdmin } from "@/server/db";
import { HttpError } from "@/server/errors";
import type { VoteType } from "@/types/models";

export async function canVote(postId: string, deviceId: string) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("votes")
    .select("id")
    .eq("post_id", postId)
    .eq("device_id", deviceId)
    .gte("created_at", tenMinutesAgo)
    .limit(1);
  if (error) throw new HttpError(500, "Не удалось проверить возможность голосования");
  return (data ?? []).length === 0;
}

export async function submitVote(postId: string, deviceId: string, voteType: VoteType) {
  const { data, error } = await supabase
    .from("votes")
    .insert([{ post_id: postId, device_id: deviceId, vote_type: voteType }])
    .select()
    .single();
  if (error || !data) throw new HttpError(500, "Не удалось отправить голос");
  return data;
}

export async function getPostVoteStats(postId: string) {
  const { data, error } = await supabaseAdmin
    .from("votes")
    .select("vote_type, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });
  if (error) throw new HttpError(500, "Не удалось загрузить статистику");

  const votes = data ?? [];
  return {
    relevant: votes.filter((v) => v.vote_type === "relevant").length,
    irrelevant: votes.filter((v) => v.vote_type === "irrelevant").length,
    total: votes.length,
    recentVotes: votes.slice(0, 10)
  };
}

/** Одним запросом считает голоса по списку меток (для админки вместо N запросов). */
export async function getVoteCountsBulk(postIds: string[]): Promise<
  Record<string, { relevant: number; irrelevant: number }>
> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from("votes")
    .select("post_id, vote_type")
    .in("post_id", postIds);
  if (error) throw new HttpError(500, "Не удалось загрузить голоса");

  const acc: Record<string, { relevant: number; irrelevant: number }> = {};
  for (const id of postIds) {
    acc[id] = { relevant: 0, irrelevant: 0 };
  }
  for (const row of data ?? []) {
    const pid = row.post_id as string;
    if (!acc[pid]) acc[pid] = { relevant: 0, irrelevant: 0 };
    if (row.vote_type === "relevant") acc[pid].relevant += 1;
    else if (row.vote_type === "irrelevant") acc[pid].irrelevant += 1;
  }
  return acc;
}

export async function deleteVotesForPost(postId: string) {
  const { error: rpcError } = await supabaseAdmin.rpc("admin_delete_votes_for_post", {
    target_post_id: postId
  });
  if (!rpcError) return;

  const { error } = await supabaseAdmin.from("votes").delete().eq("post_id", postId);
  if (error) {
    throw new HttpError(
      500,
      `Не удалось удалить голоса: ${error.message}. Если включён RLS на votes — выполните migration_v3_vote_admin_cleanup.sql в Supabase.`
    );
  }
}

export async function deleteAllVotes() {
  const { error: rpcError } = await supabaseAdmin.rpc("admin_delete_all_votes");
  if (!rpcError) return;

  const { error: errTypes } = await supabaseAdmin
    .from("votes")
    .delete()
    .in("vote_type", ["relevant", "irrelevant"]);
  if (!errTypes) return;

  const { error: errAny } = await supabaseAdmin.from("votes").delete().not("id", "is", null);
  if (!errAny) return;

  throw new HttpError(
    500,
    `Не удалось очистить голоса: ${errAny.message}. Выполните migration_v3_vote_admin_cleanup.sql в Supabase (RLS / права DELETE).`
  );
}
