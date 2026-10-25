# Roopmohana

A custom silver jewellery storefront and owner dashboard, with customer accounts, persistent inventory, Razorpay checkout and order management.

**Status:** runnable application and Docker deployment configuration. Live payment processing, email delivery, the Docker image and the production domain still need deployment validation. Automated payment tests use a simulated provider; they do not prove a real transaction works.

## Included

- Responsive storefront, collections, search, sorting, product galleries, cart and account-based wishlist.
- All 62 publicly accessible products from the existing store, with 185 locally hosted, optimized product images.
- Email/password accounts, email verification, password reset, HTTP-only sessions and CSRF protection.
- Server-enforced owner access. Initial owner: `go4av05.pvtx@gmail.com`. Verified additional owners can be granted or revoked from **Owner access**.
- Product editing, photo uploads, stock counts, customer list, order fulfilment, courier tracking, full refunds and activity history.
- Razorpay server-created orders, signed callback and webhook verification, captured-payment checks, UPI through Razorpay checkout, and status polling.
- Stock reservations, duplicate-checkout protection, idempotent payment settlement and explicit review for late payments without stock.
- Queued payment-confirmation and shipping emails through Resend, with retry and provider idempotency keys.
- Docker Compose, Caddy HTTPS, a persistent SQLite volume, backup command and automated tests.

## Local development

Requires Node.js 24 or newer. There are no third-party runtime npm dependencies and no frontend build step.

```sh
npm start
```

Open `http://localhost:3000`. To avoid another local app or an IPv6 localhost conflict:

```sh
PORT=3107 APP_URL=http://127.0.0.1:3107 npm start
```

The database initializes automatically from `catalog.json`. All imported stock quantities start at **zero**, because the original store's public API exposes availability but not physical inventory counts. Set accurate stock from the owner dashboard. No demo accounts, passwords, orders or stock counts are shipped in the production database.

### Create the initial owner

The default email is `go4av05.pvtx@gmail.com`; `OWNER_EMAIL` can override it before first setup. Set a unique password using the one-time environment variable `OWNER_SETUP_PASSWORD` and run:

```sh
npm run owner:setup
```

The password must contain at least 14 characters. Enter it through your shell's hidden input or your hosting service's secret input; do not put a literal password in command history or commit it. Remove the variable immediately after setup. The setup command refuses to overwrite an existing account. Existing accounts can use password reset once email is configured.

Sign in at `/account`, then open `/admin`. Additional owners must register with the exact email granted and verify it before their permissions take effect. The initial owner cannot be removed from the dashboard.

## Deploy with Docker and HTTPS

Use a server with Docker Compose, a persistent disk, and a domain pointing to that server. This application runs as **one replica** with local SQLite storage; do not horizontally scale it or deploy it on an ephemeral filesystem.

1. Copy `.env.example` to `.env` and fill in real deployment values.
2. Set `STORE_DOMAIN` to the domain, and `APP_URL` to its exact HTTPS origin, without a trailing slash. Set `MAIL_FROM` to a sender on your verified email domain.
3. Keep `DATABASE_PATH=/app/data/store.sqlite`, `HOST=0.0.0.0` and `PORT=3000` for the supplied container configuration.
4. Run:

   ```sh
   docker compose up -d --build
   ```

5. Bootstrap the owner inside the container. After securely setting `OWNER_SETUP_PASSWORD` in the current shell, pass that environment variable without placing its value in the command:

   ```sh
   docker compose exec -e OWNER_SETUP_PASSWORD store npm run owner:setup
   ```

   Unset the variable afterwards.
6. Sign in and complete **Launch settings**, confirm inventory and test the full customer journey.

Caddy exposes ports 80 and 443 and obtains HTTPS certificates. The application port is only exposed to the Compose network. `TRUST_PROXY=1` trusts the reverse proxy's forwarded IP for rate limiting; use it only behind a trusted proxy with direct public access to the application port blocked.

`docker compose down` preserves named volumes. **Do not use `docker compose down -v` on a live shop**, as that deletes persistent data.

### Payment activation

Set the following server-side secrets:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

In Razorpay, enable automatic capture and create a webhook at:

```text
https://YOUR-DOMAIN/api/webhooks/razorpay
```

Subscribe to `payment.captured`, `order.paid` and `refund.processed`. Use the same webhook secret in the environment. Start with test-mode keys, test payment success, failure, retries, delayed confirmation and refunds, then replace them with your activated business account's live credentials. Confirm UPI Intent/QR availability with the provider; payment methods vary by account and device.

UPI is provided through Razorpay's checkout, not a standalone unverified `upi://` link. The app verifies order ownership, amount, currency, signature and captured status before marking payment confirmed. Razorpay is a hosted gateway and its processing fees still apply.

References: [Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/) and [webhook validation](https://razorpay.com/docs/webhooks/validate-test/).

### Email activation

Configure `RESEND_API_KEY` and `MAIL_FROM` with your verified sending domain. Registration verifies email before checkout. Password resets use expiring, single-use tokens and revoke existing sessions. Payment and shipping notifications are queued in SQLite and retried while the application process runs.

### Checkout readiness

Checkout stays closed until all five server checks pass:

- Razorpay credentials and webhook secret configured.
- Email credentials configured.
- At least one active product has positive stock.
- Shipping fee for smaller orders saved in Launch settings.
- Owner confirms the published policies match the business.

Credential presence is a configuration check, not proof that those credentials or integrations work. Complete live service testing before accepting customers.

## Operations

- Existing customer records, historical orders and passwords were not migrated. Public catalog content was imported; see `CONTENT-SOURCES.md`.
- Shipping labels and courier booking are handled outside this app. Paste the courier's HTTPS tracking URL when marking an order shipped.
- The dashboard supports **full refunds**. Refunded inventory is not automatically restocked: inspect the returned item, then update stock.
- If a refund response is uncertain, use **Reconcile payment with Razorpay** and inspect the provider dashboard before attempting any other refund.
- `paid_review` means a payment was captured after stock became unavailable. It must be resolved by the owner; it cannot be shipped as a normal paid order.
- Initial catalog data seeds an empty database only. Later product changes should be made through the dashboard; changing `catalog.json` does not overwrite live inventory.
- Legal identity, GST invoicing, shipping costs and policies need business confirmation. The current order view is an order receipt, not a GST tax-invoice system.
- Customer login uses email/password. Social login, carrier API integration, partial refunds, automated tax filing and historical-store migration are not included.

### Backups

Create a consistent SQLite backup with:

```sh
node --env-file-if-exists=.env scripts/backup.mjs /absolute/path/backup.sqlite
```

For Docker, run it inside the container with a destination under `/app/data`, then copy the backup out. Back up the `uploads/` directory beside the database as well. Backups contain customer information; encrypt them and store them outside the server. Test restoration before launch. A restored database requires the matching product uploads and application version.

## Validation

```sh
npm run check
npm test
```

The 25 tests cover password hashing, HMAC validation, cart tampering, reservations, duplicate and late captures, account isolation, CSRF, order retry, owner grants/revocation, fulfilment, simulated refunds and single-use password resets. Provider calls are intercepted only by the test process's explicit preload; production startup never loads that module.

The local browser checks cover the responsive storefront, product view, shopping bag, sign-in, checkout configuration gate and owner dashboard. Real Razorpay/Resend delivery, Docker deployment, DNS and TLS require testing on the target deployment.

## Project layout

```text
public/             Storefront, dashboard and optimized images
server/index.mjs    HTTP API, authentication and payment integrations
server/store.mjs    Database schema, inventory and settlement logic
server/setup-owner.mjs  One-time owner setup
catalog.json        Initial product seed
scripts/backup.mjs  Consistent SQLite backups
tests/              Isolated unit and HTTP integration tests
compose.yaml        Application and HTTPS proxy
```
