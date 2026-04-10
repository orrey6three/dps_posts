import { promises as fs } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const template = await fs.readFile(join(process.cwd(), "templates", "index.html"), "utf8");
  const key =
    process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? process.env.YANDEX_MAPS_API_KEY ?? "";
  const body = template.replaceAll("%YANDEX_KEY%", key);
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
