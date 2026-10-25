# Roop Mohana — online store

The e-commerce site for **Roop Mohana** (925 sterling silver jewellery): storefront, customer accounts,
checkout with Razorpay / PhonePe UPI / direct UPI / COD, and a private owner dashboard.

Built with Next.js 16 (App Router), Postgres (Drizzle ORM) and Tailwind CSS 4.

---

## What's inside

| Area | What it does |
| --- | --- |
| **Storefront** | Home, shop with filters/sort/search, collections, product pages (gallery + zoom), bag drawer, wishlist, customise & contact forms, policies, SEO (sitemap, robots, product JSON-LD) |
| **Accounts** | Email + password sign-up/sign-in, optional Google sign-in, password reset by email, saved addresses, order history |
| **Checkout** | Server re-prices every order (client prices are never trusted), coupons (ROOP05 seeded), free shipping above ₹1,000, PIN-code auto-fill |
| **Payments** | **Razorpay** (cards, UPI, netbanking, wallets) · **PhonePe PG** (push a UPI request to the customer's app, Swiggy/Zomato style) · **Direct UPI** QR / tap-to-pay, zero fees, auto-confirmed from bank SMS · **Cash on delivery** |
| **Order status page** | Polls the gateway until payment settles and updates itself; retry on failure |
| **Owner dashboard** `/admin` | Revenue KPIs + 30-day chart, orders (filter, verify UPI, ship with tracking, cancel/restock, private notes, print), products (create/edit, image upload, stock, featured/visible), categories, coupons, customers, enquiries |
| **Emails** | Order confirmation, status updates (shipped etc.), password reset, owner alerts — via Resend |

### How payments are verified

The browser is never trusted to say "paid". Every path — the Razorpay success callback, the PhonePe
redirect, webhooks and the status-page poll — calls `syncPayment()` which **asks the gateway's API**
for the real status and checks the amount before marking an order paid. Marking paid is idempotent,
so the webhook and the browser racing each other is safe. Stock is reduced only once an order is
actually paid (or accepted as COD).

---

## Run it locally (2 minutes)

```bash
npm install
cp .env.example .env.local     # then set PAYMENTS_MOCK=true and UPI_VPA for testing
npm run db:seed                # with ADMIN_EMAIL / ADMIN_PASSWORD set in .env.local
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL` the app uses an embedded Postgres in `./.data`,
so no database install is needed. With `PAYMENTS_MOCK=true`, Razorpay/PhonePe are simulated by a test
page so you can run the whole checkout without keys. Sign in with the owner account → `/admin`.

> Stop `npm run dev` before running `db:seed` against the embedded database (it allows one process at a time).

---

## Go live (recommended: Vercel + Neon)

1. **Database** — create a free Postgres at [neon.tech](https://neon.tech) and copy the connection string.
2. **Deploy** — push this folder to GitHub, import it at [vercel.com/new](https://vercel.com/new).
3. **Environment variables** (Vercel → Settings → Environment Variables) — see `.env.example`. Minimum:
   - `NEXT_PUBLIC_SITE_URL` = `https://roopmohana.com`
   - `DATABASE_URL` = the Neon string
   - `AUTH_SECRET` = output of `openssl rand -base64 48`
   - Razorpay and/or PhonePe keys (below), `RESEND_API_KEY`, `OWNER_NOTIFY_EMAIL`
4. **Image uploads** — Vercel → Storage → create a **Blob** store and connect it (sets `BLOB_READ_WRITE_TOKEN`).
5. **Seed the database once** from your computer:
   ```bash
   DATABASE_URL="postgres://…neon…" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' npm run db:seed
   ```
   This loads all 62 current products (photos are bundled in `public/products`), the categories,
   the ROOP05 coupon and your owner login. Database tables are created automatically on first run.
6. **Domain** — Vercel → Domains → add `roopmohana.com` and update DNS at your registrar.
7. **Webhooks** — add the URLs below in each payment dashboard.

### Razorpay
1. Sign up at [razorpay.com](https://razorpay.com), complete KYC.
2. Settings → API Keys → generate. Put `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (start with `rzp_test_…`).
3. Settings → Webhooks → add `https://roopmohana.com/api/webhooks/razorpay`, events
   `payment.captured`, `payment.failed`, `order.paid`, and a secret → `RAZORPAY_WEBHOOK_SECRET`.
4. Test with Razorpay's test cards/UPI IDs, then switch to live keys.

### PhonePe Payment Gateway (UPI push / intent)
1. Sign up at [business.phonepe.com](https://business.phonepe.com) for the Payment Gateway.
2. Developer settings → copy Client ID / Secret / Version → `PHONEPE_CLIENT_ID`, `PHONEPE_CLIENT_SECRET`, `PHONEPE_CLIENT_VERSION`.
3. Webhook: `https://roopmohana.com/api/webhooks/phonepe` with a username/password → `PHONEPE_WEBHOOK_USERNAME` / `PHONEPE_WEBHOOK_PASSWORD`.
4. Test in sandbox (`PHONEPE_ENV=sandbox`), then set `PHONEPE_ENV=production`.

### Direct UPI (optional, no gateway fees)
Set `UPI_VPA` to a **business/merchant** UPI ID (personal VPAs often hit app limits). Customers scan
a QR or tap "Pay with UPI app" and enter the 12-digit UTR; you confirm it from **Admin → Orders → UPI to verify**
after checking your bank app. Best as a fallback — it can't be confirmed automatically.

### Automatic UPI confirmation (bank SMS, no gateway)
Direct-UPI orders can confirm themselves within seconds by reading your bank's "money received" SMS:

1. Each waiting UPI order gets a unique amount (a few paise off when two orders would cost the same).
2. An Android phone that receives your bank's SMS forwards them to the store.
3. The store reads the amount + UPI reference, finds the waiting order with exactly that amount and marks it paid.
   The customer's page updates by itself; every SMS is listed in **Admin → Bank SMS**.

Setup:
1. Generate a secret (`openssl rand -hex 24`) → set `SMS_WEBHOOK_SECRET`. Set `SMS_ALLOWED_SENDERS` to your bank's
   sender ID (HDFC = `HDFCBK`).
2. On the phone, install **Incoming SMS to URL forwarder** from F-Droid
   (package `tech.bogomolov.incomingsmsgateway`; it is not on the Play Store). Add a rule:
   - Sender: `HDFCBK`, with regex/substring matching on
   - URL: `https://<your-site>/api/webhooks/bank-sms`
   - Leave the default JSON template (`from`, `text`, …)
   - Turn on **Sign with HMAC-SHA-256** and paste the same secret
     (forwarders that can't sign may use `…/bank-sms?key=<secret>` instead)
3. Exempt the app from battery optimisation so it keeps running, and keep the phone online.
4. Test: pay a small order, then check **Admin → Bank SMS** — the credit should show as *matched*.

Notes: SMS that aren't credits (debits, OTPs, collect requests) and SMS from other senders are ignored; each UPI
reference is applied only once. If a credit can't be matched (wrong amount, or two orders tie), it's listed as
*unmatched* and you confirm that order by hand. The customer can also type their UTR as a backup.

### Google sign-in (optional)
Create an OAuth "Web application" client at console.cloud.google.com with redirect URI
`https://roopmohana.com/api/auth/google/callback`, set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

---

## Self-hosting with Docker (alternative to Vercel)

```bash
cp .env.example .env          # fill it in; DATABASE_URL is provided by compose
docker compose up -d --build
docker compose run --rm seed  # once
```
Put it behind a reverse proxy with HTTPS (Caddy / nginx). Uploaded images live in the `uploads` volume.

---

## Day-to-day (for the owner)

- **New order** → you get an email; open `/admin/orders`. Pack → set **Packed**, then **Shipped** with courier + tracking (customer is emailed).
- **Direct-UPI orders** show in *UPI to verify*. Check the UTR in your bank app → **Payment received**.
- **Add a product** → Admin → Products → Add product. Drop photos in; the first is the main image.
- **Run a sale** → set *Compare at* price higher than *Price*, or create a coupon in Admin → Coupons.
- **Stock** hits 0 → product shows *Sold out* automatically and can't be bought.

---

## Project layout

```
src/app/(store)/      storefront pages (home, shop, product, checkout, order, account…)
src/app/admin/        owner dashboard + server actions
src/app/api/          payment callbacks, webhooks, uploads, Google OAuth
src/lib/payments/     Razorpay, PhonePe, UPI, syncPayment()
src/lib/orders.ts     order creation, idempotent markOrderPaid, emails
src/lib/pricing.ts    server-side cart pricing, coupons, shipping
src/db/schema.ts      database schema (migrations in ./drizzle)
scripts/              seed, migrate, image re-hosting
data/catalog.json     the catalogue imported from the previous site
```

Schema change: edit `src/db/schema.ts` → `npm run db:generate` → commit the new file in `drizzle/`.
Migrations run automatically on startup (set `SKIP_AUTO_MIGRATE=1` and run `npm run db:migrate` to do it yourself).
