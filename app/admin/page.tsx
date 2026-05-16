import { AdminPanel } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
  const yandexApiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? process.env.YANDEX_MAPS_API_KEY ?? "";

  return (
    <AdminPanel supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} yandexApiKey={yandexApiKey} />
  );
}
