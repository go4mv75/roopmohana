"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2, X } from "lucide-react";
import { deleteProduct, saveProduct } from "@/app/admin/actions";

type P = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  categoryId: number | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  material: string;
  weightGrams: string;
  shortDescription: string;
  description: string;
  images: string[];
  featured: boolean;
  active: boolean;
};

const rupees = (p: number | null | undefined) => (p == null ? "" : String(p / 100));

export function ProductEditor({ product, categories }: { product: P | null; categories: { id: number; name: string }[] }) {
  const [state, action, saving] = useActionState(saveProduct.bind(null, product?.id ?? null), undefined);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleting, startDelete] = useTransition();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Upload failed");
        setImages((cur) => [...cur, body.url]);
      } catch (e) {
        setUploadError((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const move = (i: number, d: -1 | 1) =>
    setImages((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form action={action} className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div className="space-y-6">
        <Box title="Details">
          <Field label="Name">
            <input name="name" defaultValue={product?.name} required className="field" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="URL slug" hint="Leave blank to generate from the name">
              <input name="slug" defaultValue={product?.slug} className="field font-mono text-sm" />
            </Field>
            <Field label="SKU">
              <input name="sku" defaultValue={product?.sku} className="field font-mono text-sm" />
            </Field>
          </div>
          <Field label="Short description" hint="Shown next to the price. Blank lines separate paragraphs.">
            <textarea name="shortDescription" defaultValue={product?.shortDescription} rows={3} className="field text-sm" />
          </Field>
          <Field label="Full description">
            <textarea name="description" defaultValue={product?.description} rows={8} className="field text-sm" />
          </Field>
        </Box>

        <Box title="Images" sub="The first image is the main photo. Drag order with the arrows.">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {images.map((src, i) => (
              <div key={src + i} className="relative group aspect-[4/5] bg-sand border border-line">
                <Image src={src} alt="" fill sizes="140px" className="object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 bg-ink text-paper text-[10px] px-1.5 py-0.5">Main</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-ink/70 text-paper opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                  <button type="button" onClick={() => move(i, -1)} className="p-1.5" aria-label="Move left"><ArrowLeft size={14} /></button>
                  <button type="button" onClick={() => setImages((c) => c.filter((_, j) => j !== i))} className="p-1.5" aria-label="Remove image"><X size={14} /></button>
                  <button type="button" onClick={() => move(i, 1)} className="p-1.5" aria-label="Move right"><ArrowRight size={14} /></button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files);
              }}
              className="aspect-[4/5] border border-dashed border-ink/30 grid place-items-center text-xs text-muted hover:border-ink hover:text-ink"
            >
              <span className="flex flex-col items-center gap-2">
                <ImagePlus size={22} strokeWidth={1.4} />
                {uploading ? `Uploading ${uploading}…` : "Upload / drop"}
              </span>
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
          {uploadError && <p className="text-xs text-sindoor mt-2">{uploadError}</p>}
        </Box>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6">
        <Box title="Pricing & stock">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (₹)">
              <input name="price" defaultValue={rupees(product?.price)} required inputMode="decimal" className="field" />
            </Field>
            <Field label="Compare at (₹)" hint="Shows as strikethrough">
              <input name="compareAtPrice" defaultValue={rupees(product?.compareAtPrice)} inputMode="decimal" className="field" />
            </Field>
          </div>
          <Field label="Quantity in stock">
            <input name="stock" type="number" min={0} defaultValue={product?.stock ?? 1} required className="field" />
          </Field>
        </Box>
        <Box title="Organise">
          <Field label="Category">
            <select name="categoryId" defaultValue={product?.categoryId ?? ""} className="field">
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Material">
              <input name="material" defaultValue={product?.material ?? "925 Sterling Silver"} className="field text-sm" />
            </Field>
            <Field label="Weight (g)">
              <input name="weightGrams" defaultValue={product?.weightGrams} inputMode="decimal" className="field text-sm" />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="accent-sindoor w-4 h-4" /> Visible in store
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="accent-sindoor w-4 h-4" /> Feature on homepage (Bestsellers)
          </label>
        </Box>
        {state?.error && <p className="text-sm text-sindoor bg-sindoor-soft px-4 py-3">{state.error}</p>}
        <button disabled={saving || uploading > 0} className="btn-accent w-full">{saving ? "Saving…" : product ? "Save changes" : "Create product"}</button>
        {product && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => confirm(`Delete “${product.name}” permanently? Past orders keep their copy.`) && startDelete(() => deleteProduct(product.id))}
            className="w-full flex items-center justify-center gap-2 text-xs text-muted hover:text-sindoor py-2"
          >
            <Trash2 size={14} /> Delete product
          </button>
        )}
      </div>
    </form>
  );
}

function Box({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-paper border border-line p-5 space-y-4">
      <div>
        <h2 className="text-[12px] font-semibold tracking-[0.14em] uppercase">{title}</h2>
        {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}
