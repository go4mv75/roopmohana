/**
 * Downloads catalogue images that still point at the old WordPress site,
 * converts them to WebP (max 1600px) under public/products, and rewrites
 * data/catalog.json so the store no longer depends on the old host.
 *
 *   npm run images:rehost
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "products");
const CATALOG = path.join(ROOT, "data", "catalog.json");

type Item = { slug: string; images: string[] };

async function fetchWithRetry(url: string, tries = 3): Promise<Buffer> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (rehost script)" }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const catalog: Item[] = JSON.parse(readFileSync(CATALOG, "utf8"));
  const jobs: { item: Item; index: number; url: string; file: string }[] = [];
  for (const item of catalog) {
    item.images.forEach((url, index) => {
      if (url.startsWith("http")) jobs.push({ item, index, url, file: `${item.slug}-${index + 1}.webp` });
    });
  }
  console.log(`${jobs.length} images to rehost`);

  let done = 0;
  const failures: string[] = [];
  const worker = async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      const dest = path.join(OUT, job.file);
      try {
        if (!existsSync(dest)) {
          const buf = await fetchWithRetry(job.url);
          await sharp(buf)
            .rotate()
            .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(dest);
        }
        job.item.images[job.index] = `/products/${job.file}`;
      } catch (e) {
        failures.push(`${job.url}: ${(e as Error).message}`);
      }
      done++;
      if (done % 20 === 0) console.log(`  ${done} done`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  writeFileSync(CATALOG, JSON.stringify(catalog, null, 1));
  console.log(`Rehosted. ${failures.length} failures.`);
  failures.forEach((f) => console.log("  ✗", f));
}

main();
