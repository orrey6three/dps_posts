import { deleteAllVotes } from "@/server/votes";

/**
 * Плановая очистка голосов (то же действие, что «Очистить все голоса» в админке).
 * Вызывается только из защищённого cron endpoint или вручную из скрипта.
 */
export async function runScheduledVotesCleanup(): Promise<void> {
  await deleteAllVotes();
}
