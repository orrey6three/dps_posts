import { supabase, supabaseAdmin } from "@/server/db";
import { HttpError } from "@/server/errors";
import type { MarkerType, PostInput, PostRow } from "@/types/models";

const VALID_TYPES: MarkerType[] = ["ДПС", "Нужна помощь", "Чисто", "Вопрос", "Патруль"];

export function validatePostInput(input: Partial<PostInput>) {
  if (!input.title || !input.latitude || !input.longitude || !input.type) {
    throw new HttpError(400, "Обязательные поля: title, latitude, longitude, type");
  }
  if (!VALID_TYPES.includes(input.type)) {
    throw new HttpError(400, "Неверный тип метки");
  }
}

export async function cleanupOldPosts() {
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const fiveMinutesAgo = new Date(now - 5 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from("posts")
    .delete()
    .eq("type", "Патруль")
    .eq("is_static", false)
    .lt("created_at", fiveMinutesAgo);

  await supabaseAdmin
    .from("posts")
    .delete()
    .neq("type", "Патруль")
    .eq("is_static", false)
    .lt("created_at", oneHourAgo);
}

export async function getPostsWithStats() {
  await cleanupOldPosts();
  const { data, error } = await supabase.rpc("get_post_stats");
  if (error) throw new HttpError(500, "Не удалось загрузить посты");
  return (data ?? []) as PostRow[];
}

export async function createPost(input: PostInput, userId?: string | null) {
  validatePostInput(input);
  const payload: Record<string, unknown> = {
    title: input.title,
    address: input.address ?? "",
    latitude: input.latitude,
    longitude: input.longitude,
    type: input.type
  };
  if (input.comment) payload.comment = input.comment;
  if (input.tags?.length) payload.tags = input.tags;
  if (userId) {
    const { data: author } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();
    if (author?.id) payload.user_id = userId;
  }
  if (input.street_geometry?.length) payload.street_geometry = input.street_geometry;
  if (input.created_at) payload.created_at = input.created_at;

  const { data, error } = await supabaseAdmin.from("posts").insert([payload]).select().single();
  if (error || !data) {
    throw new HttpError(500, `Не удалось создать метку${error?.message ? `: ${error.message}` : ""}`);
  }
  return data;
}

export async function getPostOwner(postId: string) {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .single();
  if (error || !data) throw new HttpError(404, "Метка не найдена");
  return data.user_id as string | null;
}

export async function deletePost(postId: string) {
  const { error } = await supabaseAdmin.from("posts").delete().eq("id", postId);
  if (error) throw new HttpError(500, "Не удалось удалить метку");
}

export async function getAllPosts() {
  const { data, error } = await supabaseAdmin.from("posts").select("*").order("title");
  if (error) throw new HttpError(500, "Не удалось загрузить посты");
  return data ?? [];
}

export async function updatePost(postId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .select()
    .single();
  if (error || !data) throw new HttpError(500, "Не удалось обновить пост");
  return data;
}
