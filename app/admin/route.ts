import { promises as fs } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  const template = await fs.readFile(join(process.cwd(), "templates", "admin.html"), "utf8");
  return new Response(template, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
