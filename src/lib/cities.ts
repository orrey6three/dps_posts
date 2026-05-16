/** Юго-запад и северо-восток [[lat,lng],[lat,lng]] для Yandex `restrictMapArea`. */
export type MapBounds = [[number, number], [number, number]];

/** Одна точка на карте для пресета города. */
export type CityEntry = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  /** Если задано — своё окно карты (меньше лишних тайлов). Иначе считается от центра. */
  map_bounds?: MapBounds;
};

/** Полуширина окна в градусах (~45×65 км по широте Шумихи). */
const DEFAULT_LAT_PAD = 0.48;
const DEFAULT_LNG_PAD = 0.72;

export function boundsAroundCenter(
  lat: number,
  lng: number,
  latPad: number = DEFAULT_LAT_PAD,
  lngPad: number = DEFAULT_LNG_PAD
): MapBounds {
  return [
    [lat - latPad, lng - lngPad],
    [lat + latPad, lng + lngPad],
  ];
}

function parseMapBounds(raw: unknown): MapBounds | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) return undefined;
  const sw = raw[0];
  const ne = raw[1];
  if (!Array.isArray(sw) || !Array.isArray(ne) || sw.length !== 2 || ne.length !== 2) return undefined;
  const swLat = Number(sw[0]);
  const swLng = Number(sw[1]);
  const neLat = Number(ne[0]);
  const neLng = Number(ne[1]);
  if (![swLat, swLng, neLat, neLng].every(Number.isFinite)) return undefined;
  if (swLat >= neLat || swLng >= neLng) return undefined;
  return [
    [swLat, swLng],
    [neLat, neLng],
  ];
}

export function getCityMapBounds(entry: Pick<CityEntry, "lat" | "lng" | "map_bounds">): MapBounds {
  return entry.map_bounds ?? boundsAroundCenter(entry.lat, entry.lng);
}

/** Дефолтный каталог (если в БД нет `city_catalog`). */
export const DEFAULT_CITY_CATALOG: CityEntry[] = [
  { id: "shumikha", label: "Шумиха", lat: 55.2255, lng: 63.2982 },
  { id: "shchuchye", label: "Щучье", lat: 55.2133, lng: 62.7634 },
  { id: "mishkino", label: "Мишкино", lat: 55.3385, lng: 63.9168 },
  { id: "kurgan", label: "Курган", lat: 55.4444, lng: 65.3161 },
  { id: "ketovo", label: "Кетово", lat: 55.354, lng: 65.334 },
  { id: "kurtamysh", label: "Куртамыш", lat: 54.91, lng: 64.433 },
  { id: "shadrinsk", label: "Шадринск", lat: 56.086, lng: 63.634 },
  { id: "vargashi", label: "Варгаши", lat: 55.369, lng: 65.118 },
  { id: "yurgamysh", label: "Юргамыш", lat: 55.379, lng: 64.46 },
  { id: "makushino", label: "Макушино", lat: 55.21, lng: 67.251 },
  { id: "petukhovo", label: "Петухово", lat: 55.065, lng: 67.898 },
  { id: "dalmatovo", label: "Далматово", lat: 56.262, lng: 62.938 },
  { id: "tyumen", label: "Тюмень", lat: 57.1522, lng: 65.5272 },
  { id: "yekaterinburg", label: "Екатеринбург", lat: 56.8389, lng: 60.6057 },
  { id: "chelyabinsk", label: "Челябинск", lat: 55.1644, lng: 61.4368 }
];

const CYR_TO_LAT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Предлагает латинский `id` из русского названия; если не выходит — от координат. */
export function suggestCityId(label: string, lat: number, lng: number): string {
  const lower = label.trim().toLowerCase();
  let out = "";
  for (const ch of Array.from(lower)) {
    if (CYR_TO_LAT[ch]) out += CYR_TO_LAT[ch];
    else if (/^[a-z0-9]$/i.test(ch)) out += ch.toLowerCase();
    else if (ch === " " || ch === "-" || ch === "—") out += "_";
  }
  out = out.replace(/_+/g, "_").replace(/^_|_$/g, "");
  if (out.length >= 2) return out.slice(0, 48);
  const lt = lat.toFixed(4).replace(".", "_");
  const lg = lng.toFixed(4).replace(".", "_").replace("-", "m");
  return `city_${lt}_${lg}`.slice(0, 48);
}

export function normalizeCityCatalog(raw: unknown): CityEntry[] {
  if (!Array.isArray(raw)) return DEFAULT_CITY_CATALOG;
  const out: CityEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const lat = Number(o.lat);
    const lng = Number(o.lng);
    if (!id || !label || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const map_bounds = parseMapBounds(o.map_bounds);
    const city: CityEntry = { id, label, lat, lng };
    if (map_bounds) city.map_bounds = map_bounds;
    out.push(city);
  }
  return out.length ? out : DEFAULT_CITY_CATALOG;
}

export function cityCatalogToLabels(entries: CityEntry[]): Record<string, string> {
  return Object.fromEntries(entries.map((c) => [c.id, c.label]));
}
