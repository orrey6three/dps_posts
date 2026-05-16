import { MainMapClient } from "@/components/map/MainMapClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const yandexApiKey =
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? process.env.YANDEX_MAPS_API_KEY ?? "";
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

  return (
    <MainMapClient
      yandexApiKey={yandexApiKey}
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
    />
  );
}
