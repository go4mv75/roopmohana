import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { uploadDir } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Product image upload (owner only). Images are normalised to WebP ≤1600px.
 * Storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise UPLOAD_DIR
 * (default ./.data/uploads) on local disk, served by /uploads/[name] — fine for
 * a VPS / Docker volume, not for serverless.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is larger than 12 MB" }, { status: 400 });

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "That file isn't a supported image" }, { status: 400 });
  }

  const base = (file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "image").replace(/^-|-$/g, "");
  const name = `${base}-${randomBytes(4).toString("hex")}.webp`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`products/${name}`, webp, { access: "public", contentType: "image/webp" });
    return NextResponse.json({ url: blob.url });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Image storage isn't configured. Add a Vercel Blob store (BLOB_READ_WRITE_TOKEN)." }, { status: 500 });
  }
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), webp);
  return NextResponse.json({ url: `/uploads/${name}` });
}
