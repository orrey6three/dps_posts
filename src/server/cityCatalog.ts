import { DEFAULT_CITY_CATALOG, normalizeCityCatalog, type CityEntry } from "@/lib/cities";
import { supabaseAdmin } from "@/server/db";

let cachedCatalog: CityEntry[] | null = null;
let catalogExpiry = 0;

export async function getCityCatalog(): Promise<CityEntry[]> {
  const now = Date.now();
  if (cachedCatalog && now < catalogExpiry) {
    return cachedCatalog;
  }

  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "city_catalog")
    .maybeSingle();

  if (error || data == null) return DEFAULT_CITY_CATALOG;
  
  const next = normalizeCityCatalog(data.value);
  cachedCatalog = next;
  catalogExpiry = now + 60 * 1000; // Cache for 1 minute
  return next;
}
