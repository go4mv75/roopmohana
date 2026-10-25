"use client";

import { useState } from "react";
import { money } from "@/lib/format";

function compact(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${+(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${+(r / 1000).toFixed(1)}k`;
  return `₹${Math.round(r)}`;
}

type Point = { day: string; revenue: number; count: number };

/** Single-series daily revenue bars with a per-bar hover tooltip. */
export function RevenueChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.revenue), 1);
  // Round the axis top to a friendly number.
  const step = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / step) * step;
  const W = 720;
  const H = 220;
  const padL = 56;
  const padB = 26;
  const plotW = W - padL;
  const plotH = H - padB - 8;
  const bw = plotW / data.length;
  const ticks = [0, top / 2, top];
  const fmtDay = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const total = data.reduce((s, d) => s + d.revenue, 0);
  const h = hover != null ? data[hover] : null;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-3 text-sm min-h-6">
        {h ? (
          <p>
            <span className="text-muted">{fmtDay(h.day)} · </span>
            <b>{money(h.revenue)}</b>
            <span className="text-muted"> · {h.count} order{h.count === 1 ? "" : "s"}</span>
          </p>
        ) : (
          <p className="text-muted">
            Total <b className="text-ink">{money(total)}</b>
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Daily revenue for the last 30 days, total ${money(total)}`}>
        {ticks.map((t) => {
          const y = 8 + plotH - (t / top) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={W} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
                {compact(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const bh = (d.revenue / top) * plotH;
          const x = padL + i * bw + 1;
          const w = Math.max(bw - 2, 1);
          const y = 8 + plotH - bh;
          const r = Math.min(4, w / 2, bh);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * bw} y={8} width={bw} height={plotH} fill="transparent" />
              {bh > 0 && (
                <path
                  d={`M${x},${y + bh} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + bh} Z`}
                  fill={hover === i ? "var(--color-sindoor-deep)" : "var(--color-sindoor)"}
                />
              )}
              {i % 7 === 0 || i === data.length - 1 ? (
                <text x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
                  {fmtDay(d.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <details className="mt-3 text-xs text-muted">
        <summary className="cursor-pointer">View as table</summary>
        <table className="mt-2 w-full max-w-sm">
          <tbody>
            {data.filter((d) => d.count).map((d) => (
              <tr key={d.day}>
                <td className="py-0.5">{fmtDay(d.day)}</td>
                <td className="text-right">{d.count}</td>
                <td className="text-right">{money(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
