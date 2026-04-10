import { HttpError } from "@/server/errors";

function must(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(500, `Отсутствует переменная окружения ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: must("SUPABASE_URL"),
  supabaseAnonKey: must("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: must("SUPABASE_SERVICE_ROLE_KEY"),
  jwtSecret: must("JWT_SECRET"),
  adminPassword: must("ADMIN_PASSWORD"),
  botToken: process.env.BOT_TOKEN ?? "",
  yandexMapsApiKey:
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? process.env.YANDEX_MAPS_API_KEY ?? "",
  isProd: process.env.NODE_ENV === "production"
};
