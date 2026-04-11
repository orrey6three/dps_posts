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
  coords?: [number, number];
  street_geometry?: number[][];
  type?: MarkerType;
  author?: string;
};

export async function createPatrolFromBot(input: BotInput, token?: string | null) {
  if (!env.botToken) throw new HttpError(500, "BOT_TOKEN не настроен на сервере");
  if (token !== env.botToken) throw new HttpError(403, "Недействительный бот-токен");
  if (!input.street || typeof input.street !== "string") {
    throw new HttpError(400, "Поле street обязательно");
  }

  const city = input.city ?? "shumikha";
  const anchor = input.coords?.length === 2 ? input.coords : CITY_COORDS[city] ?? CITY_COORDS.shumikha;
  const type = ["ДПС", "Чисто", "Патруль", "Нужна помощь"].includes(input.type ?? "")
    ? (input.type as MarkerType)
    : "Патруль";

  const author = await resolveAuthor(input.author);
  const staticPost = await findStaticPost(input.street);
  if (staticPost) {
    const voteType = type === "Чисто" ? "irrelevant" : "relevant";
    const deviceId = author.userId ?? "bot";
    await supabaseAdmin.from("votes").insert([{ post_id: staticPost.id, device_id: deviceId, vote_type: voteType }]);
    if (author.userId) await supabaseAdmin.from("posts").update({ user_id: author.userId }).eq("id", staticPost.id);
    return { mode: "static", post: staticPost };
  }

  const existingDynamic = await findRecentDynamicPost(input.street, city);
  if (existingDynamic) {
    const updated = await updatePost(existingDynamic.id, {
      type,
      title: `${type === "Чисто" ? "Чисто" : type}: ${input.street}`,
      comment: input.comment ?? existingDynamic.comment,
      user_id: author.userId || undefined
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
      street_geometry: geometry ?? undefined
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

async function findStaticPost(street: string) {
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id")
    .eq("is_static", true)
    .ilike("address", `%${street}%`)
    .single();
  return data as { id: string } | null;
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

function pickCenterPoint(geometry: number[][]) {
  if (!geometry.length) return [55.2255, 63.2982] as [number, number];
  const mid = Math.floor(geometry.length / 2);
  const [lat, lon] = geometry[mid] ?? geometry[0];
  return [Number(lat), Number(lon)] as [number, number];
}
