import { PageHero } from "@/components/store/page-hero";
import { CartView } from "@/components/store/cart-view";
import { shipping } from "@/lib/config";

export const metadata = { title: "Your bag", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHero eyebrow="Shopping bag" title="Your bag" />
      <div className="container-x pt-12">
        <CartView freeShippingAbove={shipping.freeAbove} />
      </div>
    </>
  );
}
