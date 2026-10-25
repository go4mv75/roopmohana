"use client";

import { createContext, use, useCallback, useMemo, useState, useSyncExternalStore } from "react";

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
};

/** Tiny localStorage-backed store usable with useSyncExternalStore. */
function createLocalStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cache: { raw: string | null; value: T } | null = null;
  const read = (): T => {
    if (typeof window === "undefined") return fallback;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {}
    if (cache && cache.raw === raw) return cache.value;
    let value = fallback;
    try {
      value = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {}
    cache = { raw, value };
    return value;
  };
  const write = (value: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
    cache = null;
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => e.key === key && ((cache = null), l());
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };
  return { read, write, subscribe, server: () => fallback };
}

const EMPTY_CART: CartLine[] = [];
const EMPTY_IDS: number[] = [];
const cartStore = createLocalStore<CartLine[]>("rm_cart_v1", EMPTY_CART);
const wishStore = createLocalStore<number[]>("rm_wish_v1", EMPTY_IDS);

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "quantity">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  wishlist: number[];
  toggleWish: (productId: number) => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.read, cartStore.server);
  const wishlist = useSyncExternalStore(wishStore.subscribe, wishStore.read, wishStore.server);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const add = useCallback((line: Omit<CartLine, "quantity">, qty = 1) => {
    const cur = cartStore.read();
    const existing = cur.find((l) => l.productId === line.productId);
    cartStore.write(
      existing
        ? cur.map((l) => (l.productId === line.productId ? { ...l, ...line, quantity: Math.min(10, l.quantity + qty) } : l))
        : [...cur, { ...line, quantity: qty }],
    );
  }, []);
  const setQty = useCallback((productId: number, qty: number) => {
    const cur = cartStore.read();
    cartStore.write(
      qty <= 0
        ? cur.filter((l) => l.productId !== productId)
        : cur.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(10, qty) } : l)),
    );
  }, []);
  const remove = useCallback((productId: number) => {
    cartStore.write(cartStore.read().filter((l) => l.productId !== productId));
  }, []);
  const clear = useCallback(() => cartStore.write([]), []);
  const toggleWish = useCallback((productId: number) => {
    const cur = wishStore.read();
    wishStore.write(cur.includes(productId) ? cur.filter((x) => x !== productId) : [productId, ...cur]);
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.quantity * l.price, 0),
      add,
      setQty,
      remove,
      clear,
      drawerOpen,
      setDrawerOpen,
      wishlist,
      toggleWish,
    }),
    [lines, add, setQty, remove, clear, drawerOpen, wishlist, toggleWish],
  );
  return <Ctx value={value}>{children}</Ctx>;
}

export function useCart() {
  const c = use(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
