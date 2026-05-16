import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Клиент Supabase Realtime в браузере; credentials приходят из Server Component (там видны SUPABASE_*). */
export function createRealtimeSupabase(url: string, anonKey: string): SupabaseClient | null {
  const u = url.trim();
  const k = anonKey.trim();
  if (!u || !k) return null;
  return createClient(u, k);
}
