import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { enabledMethods } from "@/lib/payments";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const db = await getDb();
  const addresses = await db
    .select()
    .from(schema.addresses)
    .where(eq(schema.addresses.userId, user.id))
    .orderBy(desc(schema.addresses.isDefault), desc(schema.addresses.id));

  return (
    <section className="container-x py-12 sm:py-16">
      <div className="mb-10">
        <p className="eyebrow">Secure checkout</p>
        <h1 className="display text-5xl mt-3">Checkout</h1>
      </div>
      <CheckoutForm
        user={{ name: user.name, email: user.email, phone: user.phone }}
        addresses={addresses.map((a) => ({
          id: a.id,
          name: a.name,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2 ?? "",
          city: a.city,
          state: a.state,
          pincode: a.pincode,
        }))}
        methods={enabledMethods()}
      />
    </section>
  );
}
