"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User, X, ChevronDown } from "lucide-react";
import { useCart } from "./cart-store";
import { Logo } from "./logo";

type NavCategory = { slug: string; name: string; count: number };

export function Header({ categories, signedIn, isAdmin }: { categories: NavCategory[]; signedIn: boolean; isAdmin: boolean }) {
  const { count, wishlist, setDrawerOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on navigation
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }

  const shown = categories.filter((c) => c.count > 0);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-[background,box-shadow,border-color] duration-300 border-b ${
          scrolled ? "bg-paper/90 backdrop-blur-md border-line shadow-[0_1px_0_rgba(0,0,0,0.02)]" : "bg-paper border-transparent"
        }`}
      >
        <div className="container-x grid grid-cols-[1fr_auto_1fr] items-center h-16 lg:h-20">
          <nav className="flex items-center gap-1 lg:gap-6">
            <button className="lg:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={22} strokeWidth={1.5} />
            </button>
            <NavLink href="/shop">Shop</NavLink>
            <div className="hidden lg:block relative" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
              <button
                className="flex items-center gap-1 text-[12px] font-semibold tracking-[0.16em] uppercase hover:text-sindoor h-20"
                onClick={() => setMegaOpen((v) => !v)}
                aria-expanded={megaOpen}
              >
                Collections <ChevronDown size={14} className={`transition-transform ${megaOpen ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`absolute left-0 top-full -mt-px w-[520px] bg-paper border border-line shadow-xl p-8 grid grid-cols-2 gap-x-10 gap-y-3 transition-all duration-300 ${
                  megaOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
                }`}
              >
                <p className="eyebrow col-span-2 mb-2">Shop by piece</p>
                {shown.map((c) => (
                  <Link key={c.slug} href={`/collections/${c.slug}`} className="display text-xl hover:text-sindoor flex justify-between">
                    {c.name}
                    <span className="font-sans text-xs text-muted self-center">{c.count}</span>
                  </Link>
                ))}
              </div>
            </div>
            <NavLink href="/customise">Customise</NavLink>
            <NavLink href="/about" className="xl:inline">Our Story</NavLink>
          </nav>

          <Link href="/" aria-label="Roop Mohana home" className="justify-self-center">
            <Logo />
          </Link>

          <div className="flex items-center justify-end gap-0.5 sm:gap-2">
            <IconButton label="Search" onClick={() => setSearchOpen(true)}>
              <Search size={20} strokeWidth={1.5} />
            </IconButton>
            <Link href={isAdmin ? "/admin" : signedIn ? "/account" : "/login"} className="hidden sm:grid p-2 place-items-center hover:text-sindoor" aria-label="Account">
              <User size={20} strokeWidth={1.5} />
            </Link>
            <Link href="/wishlist" className="hidden sm:grid relative p-2 place-items-center hover:text-sindoor" aria-label="Wishlist">
              <Heart size={20} strokeWidth={1.5} />
              {wishlist.length > 0 && <Badge>{wishlist.length}</Badge>}
            </Link>
            <IconButton label={`Bag, ${count} items`} onClick={() => setDrawerOpen(true)}>
              <ShoppingBag size={20} strokeWidth={1.5} />
              {count > 0 && <Badge>{count}</Badge>}
            </IconButton>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-[70] lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-ink/40 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setMobileOpen(false)} />
        <aside
          className={`absolute left-0 top-0 h-full w-[86%] max-w-sm bg-paper flex flex-col transition-transform duration-500 ease-[var(--ease-soft)] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between px-5 h-16 border-b border-line">
            <Logo small />
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2 -mr-2">
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <p className="eyebrow mb-3">Collections</p>
            <ul className="space-y-1 mb-8">
              <li>
                <Link href="/shop" className="display text-2xl block py-1">All jewellery</Link>
              </li>
              {shown.map((c) => (
                <li key={c.slug}>
                  <Link href={`/collections/${c.slug}`} className="display text-2xl block py-1">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-3 text-[13px] font-semibold tracking-[0.14em] uppercase">
              <li><Link href="/customise">Customise a piece</Link></li>
              <li><Link href="/about">Our story</Link></li>
              <li><Link href="/wishlist">Wishlist</Link></li>
              <li><Link href={signedIn ? "/account" : "/login"}>{signedIn ? "My account" : "Sign in / Register"}</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function NavLink({ href, children, className = "lg:inline" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`hidden ${className} whitespace-nowrap text-[12px] font-semibold tracking-[0.16em] uppercase hover:text-sindoor transition-colors`}>
      {children}
    </Link>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="relative p-2 grid place-items-center hover:text-sindoor transition-colors">
      {children}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-sindoor text-paper text-[10px] font-bold grid place-items-center tabular-nums">
      {children}
    </span>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <div className={`fixed inset-0 z-[80] ${open ? "" : "pointer-events-none"}`}>
      <div className={`absolute inset-0 bg-ink/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`absolute inset-x-0 top-0 bg-paper border-b border-line transition-transform duration-500 ease-[var(--ease-soft)] ${open ? "translate-y-0" : "-translate-y-full"}`}>
        <form
          className="container-x flex items-center gap-4 h-24"
          onSubmit={(e) => {
            e.preventDefault();
            const q = input.current?.value.trim();
            if (q) router.push(`/shop?q=${encodeURIComponent(q)}`);
            onClose();
          }}
        >
          <Search size={22} strokeWidth={1.5} className="text-muted" />
          <input
            ref={input}
            name="q"
            placeholder="Search rings, payal, pendants…"
            className="flex-1 bg-transparent display text-2xl sm:text-3xl outline-none placeholder:text-muted/60"
            aria-label="Search products"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="p-2">
            <X size={22} strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
