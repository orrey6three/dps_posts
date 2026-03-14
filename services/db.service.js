import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error('Missing Supabase credentials in .env');
}

/** Public client (RLS enabled) */
export const supabase = createClient(supabaseUrl, anonKey);

/** Admin client (RLS bypass) */
export const supabaseAdmin = createClient(supabaseUrl, serviceKey);
