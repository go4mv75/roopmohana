import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/auth/actions";
import { money, formatDate, statusLabel } from "@/lib/format";
import { ProfileForm, PasswordForm, DeleteAddressButton } from "@/components/store/account-forms";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const db = await getDb();
  const [orders, addresses, [account]] = await Promise.all([
    db.select().from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt)).limit(50),
    db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)).orderBy(desc(schema.addresses.isDefault)),
    db.select({ hasPassword: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id)),
  ]);

  return (
    <section className="container-x py-12 sm:py-16">
      <div className="flex flex-wrap justify-between items-end gap-6 mb-12">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="display text-5xl mt-3">Namaste, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-3">
          {user.role === "admin" && <Link href="/admin" className="btn-primary">Owner dashboard</Link>}
          <form action={logout}>
            <button className="btn-outline">Sign out</button>
          </form>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-12">
        <div>
          <h2 className="display text-3xl mb-6" id="orders">Your orders</h2>
          {orders.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-muted">No orders yet.</p>
              <Link href="/shop" className="btn-primary mt-6">Start shopping</Link>
            </div>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.id}`} className="flex flex-wrap items-center gap-x-8 gap-y-1 py-5 hover:bg-ivory/60 px-2 -mx-2">
                    <span className="font-mono text-sm font-semibold">{o.number}</span>
                    <span className="text-sm text-muted">{formatDate(o.createdAt)}</span>
                    <span className="text-sm flex-1">{o.paymentStatus === "failed" ? "Payment failed" : statusLabel[o.status]}</span>
                    <span className="font-semibold">{money(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-10">
          <div className="card p-6">
            <p className="eyebrow mb-4">Profile</p>
            <p className="text-sm text-muted mb-4">{user.email}</p>
            <ProfileForm name={user.name} phone={user.phone ?? ""} />
          </div>
          <div className="card p-6">
            <p className="eyebrow mb-4">Saved addresses</p>
            {addresses.length === 0 ? (
              <p className="text-sm text-muted">Addresses you use at checkout are saved here.</p>
            ) : (
              <ul className="space-y-4">
                {addresses.map((a) => (
                  <li key={a.id} className="text-sm leading-relaxed flex justify-between gap-4">
                    <span>
                      <b>{a.name}</b> · {a.phone}
                      <br />
                      <span className="text-muted">
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                      </span>
                    </span>
                    <DeleteAddressButton id={a.id} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-6">
            <p className="eyebrow mb-4">{account.hasPassword ? "Change password" : "Set a password"}</p>
            <PasswordForm needsCurrent={Boolean(account.hasPassword)} />
          </div>
        </div>
      </div>
    </section>
  );
}
