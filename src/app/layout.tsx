import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope, Tiro_Devanagari_Hindi } from "next/font/google";
import { store, siteUrl } from "@/lib/config";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const tiro = Tiro_Devanagari_Hindi({
  subsets: ["devanagari"],
  weight: "400",
  variable: "--font-tiro",
  display: "swap",
});

// Storefront is database-driven (stock, prices) — render per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${store.name} — 925 Sterling Silver Jewellery`, template: `%s · ${store.name}` },
  description: store.description,
  openGraph: {
    type: "website",
    siteName: store.name,
    locale: "en_IN",
    title: `${store.name} — 925 Sterling Silver Jewellery`,
    description: store.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${manrope.variable} ${tiro.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
