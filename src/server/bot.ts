import { createPost, updatePost } from "@/server/posts";
import { supabaseAdmin } from "@/server/db";
import { env } from "@/server/env";
import { HttpError } from "@/server/errors";
import type { MarkerType } from "@/types/models";

const CITY_COORDS: Record<string, [number, number]> = {
  shchuchye: [55.2133, 62.7634],
  shumikha: [55.2255, 63.2982],
  mishkino: [55.3385, 63.9168]
};

type BotInput = {
  street?: string;
  city?: string;
  comment?: string;
  /** Одна точка `[lat, lon]` или массив точек `[[lat, lon], ...]` от бота */
  coords?: [number, number] | [number, number][];
  street_geometry?: number[][];
  type?: MarkerType;
  author?: string;
  date?: number;
};

function resolveCityKey(raw: string): keyof typeof CITY_COORDS {
  const s = raw.toLowerCase().trim();
  if (s.includes("щуч") || s === "shchuchye") return "shchuchye";
  if (s.includes("мишкин") || s === "mishkino") return "mishkino";
  if (s.includes("шумих") || s === "shumikha") return "shumikha";
  return "shumikha";
}

/** Приводит coords бота к одной паре `[lat, lon]` */
function normalizeBotCoordsPair(coords: BotInput["coords"]): [number, number] | undefined {
  if (!coords || !Array.isArray(coords) || coords.length === 0) return undefined;
  const a = coords[0];
  const b = coords[1];
  if (typeof a === "number" && typeof b === "number") return [a, b];
  if (Array.isArray(a) && a.length >= 2 && typeof a[0] === "number" && typeof a[1] === "number") {
    return [a[0], a[1]];
  }
  return undefined;
}

export async function createPatrolFromBot(input: BotInput, token?: string | null) {
  if (!env.botToken) throw new HttpError(500, "BOT_TOKEN не настроен на сервере");
  if (token !== env.botToken) throw new HttpError(403, "Недействительный бот-токен");
  if (!input.street || typeof input.street !== "string") {
    throw new HttpError(400, "Поле street обязательно");
  }

  const city = input.city ?? "Шумиха";
  const cityKey = resolveCityKey(city);
  const coordPair = normalizeBotCoordsPair(input.coords);
  const anchor = coordPair ?? CITY_COORDS[cityKey] ?? CITY_COORDS.shumikha;
  const type = ["ДПС", "Чисто", "Патруль", "Нужна помощь"].includes(input.type ?? "")
    ? (input.type as MarkerType)
    : "Патруль";

  const author = await resolveAuthor(input.author);
  const staticPosts = await findStaticPosts(input.street);
  
  if (staticPosts.length > 0) {
    const voteType = type === "Чисто" ? "irrelevant" : "relevant";
    const deviceId = author.userId ?? "bot";
    
    for (const post of staticPosts) {
      await supabaseAdmin.from("votes").insert([{ 
        post_id: post.id, 
        device_id: deviceId, 
        vote_type: voteType 
      }]);
      if (author.userId) {
        await supabaseAdmin.from("posts").update({ user_id: author.userId }).eq("id", post.id);
      }
    }
    
    // If it was just a Clear report on static posts, we're done
    if (type === "Чисто") return { mode: "static", posts: staticPosts };
  }

  const existingDynamic = await findRecentDynamicPost(input.street, city);
  if (existingDynamic) {
    const updated = await updatePost(existingDynamic.id, {
      type,
      title: `${type === "Чисто" ? "Чисто" : type}: ${input.street}`,
      comment: input.comment ?? existingDynamic.comment,
      user_id: author.userId || undefined,
      created_at: input.date ? new Date(input.date * 1000).toISOString() : undefined
    });
    return { mode: "dynamic", post: updated, updated: true };
  }

  const geometry = input.street_geometry?.length
    ? input.street_geometry
    : await fetchStreetGeometry(input.street, anchor);
  const [latitude, longitude] = pickCenterPoint(geometry ?? anchor);

  const post = await createPost(
    {
      title: `${type === "Чисто" ? "Чисто" : type}: ${input.street}`,
      address: `${input.street}, ${city}`,
      latitude,
      longitude,
      type,
      comment: input.comment ?? "",
      tags: [],
      street_geometry: geometry ?? undefined,
      created_at: input.date ? new Date(input.date * 1000).toISOString() : undefined
    },
    author.userId
  );
  return { mode: "dynamic", post };
}

async function resolveAuthor(author?: string) {
  if (!author) return { userId: null as string | null };
  const username = author.startsWith("@") ? author : `@${author}`;
  const { data: existing } = await supabaseAdmin.from("users").select("id").eq("username", username).single();
  if (existing?.id) return { userId: existing.id as string };
  const { data } = await supabaseAdmin
    .from("users")
    .insert([{ username, password_hash: "TELEGRAM_USER", role: "user" }])
    .select("id")
    .single();
  return { userId: (data?.id as string) ?? null };
}

async function findStaticPosts(street: string) {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("is_static", true)
    .ilike("address", `%${street}%`);
  return (data || []) as { id: string }[];
}

async function findRecentDynamicPost(street: string, city: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, comment")
    .eq("is_static", false)
    .eq("type", "ДПС") // Мы заменяем только активные ДПС
    .ilike("address", `%${street}%`)
    .gt("created_at", oneHourAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as { id: string; comment: string } | null;
}

async function fetchStreetGeometry(street: string, anchor: [number, number]) {
  const [lat, lon] = anchor;
  const escaped = street.replace(/"/g, '\\"');
  const query = `[out:json][timeout:12];
(
way["name"~"${escaped}",i](around:5000,${lat},${lon});
relation["name"~"${escaped}",i](around:5000,${lat},${lon});
);
out geom 1;`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    const way = data?.elements?.find(
      (el: { type: string; geometry?: { lat: number; lon: number }[] }) =>
        (el.type === "way" || el.type === "relation") && Array.isArray(el.geometry) && el.geometry.length > 1
    );
    return way?.geometry?.map((pt: { lat: number; lon: number }) => [pt.lat, pt.lon]) ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Полилиния `[[lat,lon],...]` или одна пара `[lat, lon]` (когда нет OSM-геометрии и подставили anchor) */
function pickCenterPoint(geometry: number[][] | [number, number]): [number, number] {
  if (!geometry || geometry.length === 0) return [55.2255, 63.2982];
  const first = geometry[0];
  if (typeof first === "number" && typeof geometry[1] === "number") {
    const pair = geometry as [number, number];
    return [Number(pair[0]), Number(pair[1])];
  }
  const line = geometry as number[][];
  if (!line.length) return [55.2255, 63.2982];
  const mid = Math.floor(line.length / 2);
  const pt = line[mid] ?? line[0];
  return [Number(pt[0]), Number(pt[1])];
}
