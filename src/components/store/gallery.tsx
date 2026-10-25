"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  if (!images.length) return <div className="aspect-[4/5] bg-sand" />;

  return (
    <div className="grid sm:grid-cols-[76px_1fr] gap-3 sm:gap-4">
      <div className="order-2 sm:order-1 flex sm:flex-col gap-3 overflow-x-auto scrollbar-none">
        {images.map((src, i) => (
          <button
            key={src}
            onClick={() => setActive(i)}
            aria-label={`Show image ${i + 1}`}
            aria-current={i === active}
            className={`relative shrink-0 w-[68px] sm:w-full aspect-[4/5] bg-sand overflow-hidden transition-opacity ${
              i === active ? "ring-1 ring-ink ring-offset-2 ring-offset-paper" : "opacity-60 hover:opacity-100"
            }`}
          >
            <Image src={src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
      <div
        className="order-1 sm:order-2 relative aspect-[4/5] bg-sand overflow-hidden cursor-zoom-in"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <Image
          key={images[active]}
          src={images[active]}
          alt={name}
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover transition-transform duration-300"
          style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
    </div>
  );
}
