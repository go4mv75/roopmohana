import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/auth/actions";
import { AdminNav } from "@/components/admin/nav";

export const metadata = { title: { default: "Dashboard", template: "%s · Roop Mohana Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh bg-ivory/60 lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="bg-ink text-paper/80 lg:sticky lg:top-0 lg:h-dvh flex flex-col">
        <div className="px-5 h-16 flex items-center justify-between lg:justify-start border-b border-paper/10">
          <Link href="/admin" className="display text-lg tracking-[0.14em] uppercase text-paper whitespace-nowrap">
            Roop<span className="text-[#e9c9c2] mx-1">✦</span>Mohana
          </Link>
        </div>
        <AdminNav />
        <div className="hidden lg:block mt-auto p-5 border-t border-paper/10 text-xs space-y-3">
          <p className="text-paper/50">Signed in as</p>
          <p className="text-paper truncate">{admin.email}</p>
          <div className="flex gap-4">
            <Link href="/" className="underline hover:text-paper">View store</Link>
            <form action={logout}>
              <button className="underline hover:text-paper">Sign out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 sm:px-8 py-8 max-w-[1400px]">{children}</main>
    </div>
  );
}
