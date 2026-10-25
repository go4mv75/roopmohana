import { PageHero } from "@/components/store/page-hero";
import { WishlistView } from "@/components/store/wishlist-view";

export const metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return (
    <>
      <PageHero eyebrow="Saved for later" title="Your wishlist" />
      <div className="container-x pt-12">
        <WishlistView />
      </div>
    </>
  );
}
