import { HttpError } from "@/server/errors";
import { supabaseAdmin } from "@/server/db";

export const AVATAR_BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;

function sniffImageMime(buf: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function extForMime(m: "image/jpeg" | "image/png" | "image/webp"): string {
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  return "webp";
}

async function clearUserAvatarObjects(userId: string) {
  const { data: listed, error: listErr } = await supabaseAdmin.storage.from(AVATAR_BUCKET).list(userId, {
    limit: 100
  });
  if (listErr || !listed?.length) return;
  const paths = listed.map((f) => `${userId}/${f.name}`);
  await supabaseAdmin.storage.from(AVATAR_BUCKET).remove(paths);
}

export async function uploadUserAvatar(userId: string, fileBytes: Uint8Array): Promise<string> {
  if (fileBytes.length > MAX_BYTES) throw new HttpError(400, "Файл больше 2 МБ");
  if (fileBytes.length < 12) throw new HttpError(400, "Некорректное изображение");

  const mime = sniffImageMime(fileBytes);
  if (!mime) throw new HttpError(400, "Допустимы только JPEG, PNG или WebP");

  await clearUserAvatarObjects(userId);

  const ext = extForMime(mime);
  const path = `${userId}/avatar.${ext}`;
  const buf = Buffer.from(fileBytes);

  const { error: upErr } = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(path, buf, {
    contentType: mime,
    upsert: true
  });

  if (upErr) {
    console.error("[avatar upload]", upErr);
    throw new HttpError(
      503,
      "Не удалось сохранить файл. Проверьте бакет Storage «avatars» и политики в Supabase."
    );
  }

  const { data: pub } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;
  if (!url) throw new HttpError(500, "Не удалось получить URL аватара");

  const { error: dbErr } = await supabaseAdmin.from("users").update({ avatar_url: url }).eq("id", userId);
  if (dbErr) {
    console.error("[avatar db]", dbErr);
    throw new HttpError(500, "Файл загружен, но не удалось записать URL — добавьте колонку avatar_url");
  }

  return url;
}

export async function removeUserAvatar(userId: string): Promise<void> {
  await clearUserAvatarObjects(userId);
  const { error } = await supabaseAdmin.from("users").update({ avatar_url: null }).eq("id", userId);
  if (error) throw new HttpError(500, "Не удалось обновить профиль");
}
