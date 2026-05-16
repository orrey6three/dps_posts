import { AdminPanel } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

  return <AdminPanel supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />;
}
