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
