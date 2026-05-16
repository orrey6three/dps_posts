import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Один браузерный клиент на пару url+anon — иначе Supabase пишет в консоль
 * «Multiple GoTrueClient instances» (Strict Mode / смена страниц создавали новые экземпляры).
 * Авторизация в приложении своя (JWT cookie), Supabase Auth и localStorage не используем.
 */
const browserClients = new Map<string, SupabaseClient>();

const realtimeAuthOptions = {
  persistSession: false as const,
  autoRefreshToken: false as const,
  detectSessionInUrl: false as const
};

/** Клиент Supabase Realtime в браузере; credentials приходят из Server Component. */
export function createRealtimeSupabase(url: string, anonKey: string): SupabaseClient | null {
  const u = url.trim();
  const k = anonKey.trim();
  if (!u || !k) return null;
  const cacheKey = `${u}\u0000${k}`;
  let client = browserClients.get(cacheKey);
  if (!client) {
    client = createClient(u, k, { auth: realtimeAuthOptions });
    browserClients.set(cacheKey, client);
  }
  return client;
}
