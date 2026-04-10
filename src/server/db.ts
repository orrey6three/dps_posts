import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
