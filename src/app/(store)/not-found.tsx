import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-x py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display text-5xl sm:text-6xl mt-4">This piece has wandered off</h1>
      <p className="text-muted mt-4">The page you’re looking for doesn’t exist or has moved.</p>
      <div className="flex gap-3 justify-center mt-10">
        <Link href="/shop" className="btn-primary">Shop the collection</Link>
        <Link href="/" className="btn-outline">Home</Link>
      </div>
    </section>
  );
}
