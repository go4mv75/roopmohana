import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir } from "@/lib/uploads";

/** Serves images uploaded to local disk (when Vercel Blob isn't configured). */
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[name]">) {
  const { name } = await ctx.params;
  if (!/^[a-z0-9-]+\.webp$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(uploadDir(), name));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
