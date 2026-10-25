import { CartProvider } from "@/components/store/cart-store";
import { CartDrawer } from "@/components/store/cart-drawer";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { getCategories } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { shipping } from "@/lib/config";
import { money } from "@/lib/format";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [categories, user] = await Promise.all([getCategories(), getCurrentUser()]);
  const nav = categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count }));
  return (
    <CartProvider>
      <div className="bg-sindoor text-paper text-[11px] sm:text-xs tracking-[0.14em] uppercase text-center py-2.5 px-4">
        Free shipping on prepaid orders above {money(shipping.freeAbove)}
        <span className="hidden sm:inline">
          {" "}· First order? Use <b className="font-semibold">ROOP05</b> for 5% off
        </span>
      </div>
      <Header categories={nav} signedIn={!!user} isAdmin={user?.role === "admin"} />
      <main>{children}</main>
      <Footer categories={nav} />
      <CartDrawer freeShippingAbove={shipping.freeAbove} />
    </CartProvider>
  );
}
