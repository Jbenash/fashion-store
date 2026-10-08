# Atelier — Fashion Store

A full-stack e-commerce application for a fashion retailer selling clothing and
accessories. It covers the complete shopping flow — browsing, filtering, product
variants, cart, checkout, payment handoff and order tracking — plus an admin
panel for product, inventory and order management.

Because a fashion retailer sells the *same* garment in several sizes and
colours, the data model treats a **product variant** (one size + one colour) as
the unit that carries stock and that orders point at. Larger "bulk" orders are a
first-class case: a product can carry a second price tier that applies
automatically once the quantity crosses a minimum.

---

## 1. Technologies

**Backend**

| Concern | Choice |
|---|---|
| Runtime / framework | Node.js 24, NestJS 12 (ESM) |
| Language | TypeScript |
| Database | PostgreSQL (developed against Neon) |
| ORM | TypeORM 1.x |
| Auth | Passport JWT, bcryptjs |
| Validation | class-validator + class-transformer |
| Hardening | helmet, @nestjs/throttler, CORS allowlist |
| Payments | PayHere (hosted checkout + server-to-server notify) |
| Image hosting | Cloudinary (signed direct-from-browser upload) |

**Frontend**

| Concern | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Routing | react-router-dom 7 |
| State | React Context (auth, cart, toasts) |
| Styling | Hand-written CSS design system (no UI kit) |
| Fonts | Fraunces (display) + Inter (UI), via Google Fonts |

There is no component library. The UI is built on a small token-driven
stylesheet (`frontend/src/styles.css`) so the visual language stays consistent
and the bundle stays small (~102 kB gzipped JS, ~6 kB gzipped CSS).

---

## 2. Setup

### Prerequisites

- Node.js 20+ (developed on 24)
- A PostgreSQL database (local or hosted)

### Backend

```bash
cd backend
npm install
cp .env.example .env     # then edit it — see the table below
npm run start:dev        # http://localhost:3000/api
```

`backend/.env`:

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | Defaults to 3000 |
| `DATABASE_URL` | **yes** | Postgres connection string |
| `DB_SSL` | no | `true` forces SSL with `rejectUnauthorized: false` |
| `JWT_SECRET` | **yes** | Long random string |
| `FRONTEND_URL` | **yes** | CORS origin + payment return URL (`http://localhost:5173`) |
| `BACKEND_URL` | **yes** | Used to build the PayHere notify URL |
| `ADMIN_EMAIL` | **yes** | Seeded admin account |
| `ADMIN_PASSWORD` | **yes** | Seeded admin password — change it |
| `PAYHERE_MERCHANT_ID` | for card payments | Sandbox merchant id |
| `PAYHERE_MERCHANT_SECRET` | for card payments | Used for the MD5 signature |
| `PAYHERE_CHECKOUT_URL` | for card payments | Sandbox: `https://sandbox.payhere.lk/pay/checkout` |
| `WHATSAPP_NUMBER` | **yes** | Store number in international form, no `+` |
| `CLOUDINARY_CLOUD_NAME` | for image upload | From the Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | for image upload | From the Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | for image upload | Never leaves the server |
| `CLOUDINARY_FOLDER` | no | Defaults to `fashion-store/products` |

Leave the Cloudinary keys blank and uploads are disabled: the signature endpoint
returns `503` and the admin form falls back to pasting an image URL by hand.

On first boot `SeedService` creates the admin user, three categories (Men,
Women, Accessories) and four demo products with variants. It is idempotent — it
skips seeding if products already exist.

The demo products point at photographs in this store's own Cloudinary folder
(`fashion-store/products/*.jpg`, sourced from Unsplash under the Unsplash
License). If `CLOUDINARY_CLOUD_NAME` is unset the seed leaves `imageUrl` null
and the storefront draws its own placeholder, rather than linking a URL that
would 404.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:3000/api
npm run dev              # http://localhost:5173
```

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` to reach the admin panel at
`/admin`. Registering through the UI always creates a `CUSTOMER`.

---

## 2b. Deployment

The API runs on **Render** and the SPA on **Vercel**. The API must be publicly
reachable over HTTPS, because PayHere refuses to send its `notify_url` callback
to plain HTTP or to `localhost` — which is why the paid flow cannot be completed
on a dev machine without a tunnel.

The two URLs reference each other, so deploy in this order.

### 1. API on Render

`render.yaml` in the repo root describes the service. In Render choose
**New > Blueprint**, point it at this repo, and fill in the values it prompts
for (everything marked `sync: false` is a secret and is deliberately not stored
in git).

Two details that matter:

- The build command is `npm ci --include=dev && npm run build`. `@nestjs/cli`
  is a devDependency, so with `NODE_ENV=production` set a plain `npm ci` would
  skip it and `nest build` would fail.
- `NODE_ENV=production` also switches `main.ts` from the permissive
  development CORS rule to the strict allowlist.

Set `BACKEND_URL` to the service's own `https://<name>.onrender.com` address
once Render assigns it. Leave `FRONTEND_URL` until step 2.

On the free plan the service sleeps after about 15 minutes idle, so the first
request afterwards takes roughly 50 seconds.

### 2. SPA on Vercel

Import the repo and set **Root Directory** to `frontend`; `frontend/vercel.json`
supplies the rest. Add one environment variable:

```
VITE_API_URL=https://<your-render-service>.onrender.com/api
```

Vite inlines this at build time, so changing it later needs a redeploy, not just
a restart.

The rewrite in `vercel.json` is what makes client-side routing work: without it
a refresh on `/products/3` would 404, because no such file exists on disk.

### 3. Point them at each other

Back in Render, set `FRONTEND_URL` to the exact Vercel origin — no trailing
slash — and redeploy. That single value drives both the CORS allowlist and
PayHere's return/cancel URLs.

Vercel gives every preview deployment its own hostname, and those are not the
production origin, so they will fail CORS. Add them to `CORS_EXTRA_ORIGINS`
(comma separated) if you need previews to talk to the API.

### 4. PayHere sandbox

Register a sandbox merchant at
[sandbox.payhere.lk](https://sandbox.payhere.lk/merchant/sign-up) — it is a
separate account from live and needs no bank details. Under
**Settings > Domains & Credentials** add your Vercel domain, then copy the
Merchant ID and Secret into Render.

Test cards (any valid-looking name, CVV and future expiry):

| Card | Number |
|---|---|
| Visa | `4916217501611292` |
| MasterCard | `5307732125531191` |
| AMEX | `346781005510225` |

The portal also lists cards that force specific declines — insufficient funds,
limit exceeded, do not honor, network error — which exercise the failure path in
`handlePayhereNotify`.

---

## 3. Architecture

```
fashion-store/
├─ backend/                     NestJS API, global prefix /api
│  └─ src/
│     ├─ app.module.ts          config, TypeORM, throttler, feature modules
│     ├─ main.ts                helmet, CORS, global ValidationPipe
│     ├─ common/                guards, @CurrentUser, decimal transformer
│     ├─ users/                 User entity + lookup service
│     ├─ auth/                  register / login, JWT strategy
│     ├─ categories/            Category entity + controller
│     ├─ products/              Product + ProductVariant, filtering, admin CRUD
│     ├─ orders/                Order + OrderItem, checkout transaction, PayHere
│     ├─ uploads/               Cloudinary signing + asset deletion
│     └─ seed/                  first-boot admin + demo data
└─ frontend/                    React SPA
   └─ src/
      ├─ lib/                   api client, types, formatters, hooks
      ├─ store/                 auth, cart and toast contexts
      ├─ components/            Layout, ProductCard, guards, states, icons
      └─ pages/                 storefront pages + pages/admin/*
```

### Layering

The backend follows Nest's module-per-domain convention: a **controller** does
HTTP and authorization, a **service** holds business rules, and **entities**
describe the schema. Only `OrdersService` needs a transaction, so it is the only
place that injects `DataSource` directly; everything else uses repositories.

The frontend keeps all network access in one typed client
(`frontend/src/lib/api.ts`). Pages never call `fetch`. Server state is fetched
through a small `useAsync` hook that discards responses from superseded
requests, so rapid filter changes can't flicker stale results back onto the
page. Only three things are global: the signed-in user, the cart and toasts.

### Routes

Storefront: `/`, `/products`, `/products/:id`, `/bulk`, `/cart`, `/login`,
`/register`.
Customer (auth required): `/checkout`, `/account/orders`, `/orders/:id`.
Admin (role required): `/admin`, `/admin/orders`, `/admin/orders/:id`,
`/admin/products`, `/admin/products/new`, `/admin/products/:id`,
`/admin/categories`.

### API surface

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public (throttled 5/min) |
| GET | `/api/categories` | public |
| POST | `/api/categories` | admin |
| GET | `/api/products` | public — `search`, `categoryId`, `size`, `minPrice`, `maxPrice`, `sort` |
| GET | `/api/products/:id` | public (active only) |
| GET | `/api/products/admin/all` | admin (includes hidden) |
| GET | `/api/products/admin/:id` | admin |
| POST / PATCH / DELETE | `/api/products[/:id]` | admin (DELETE = soft hide) |
| POST | `/api/orders` | customer |
| GET | `/api/orders/my` | customer |
| GET | `/api/orders/:id` | owner or admin |
| GET | `/api/orders?status=` | admin |
| PATCH | `/api/orders/:id/status` | admin |
| POST | `/api/payments/payhere/notify` | PayHere (signature-verified) |
| POST | `/api/uploads/signature` | admin — short-lived Cloudinary upload signature |

---

## 4. Database design

```
Users                          categories
  id            pk               id            pk
  name                           name          unique
  email         unique
  password      select:false   products
  role          CUSTOMER|ADMIN   id            pk
  createdAt                      name, description
                                 price         numeric(10,2)
orders                           bulkMinQty    int           null
  id            pk               bulkPrice     numeric(10,2) null
  orderNumber   unique           imageUrl      varchar       null
  userId        fk → Users       imagePublicId varchar       null  ← Cloudinary
  customerName                   isActive      bool
  phone, email                   categoryId    fk → categories
  address, city                  createdAt
  paymentMethod PAYHERE|WHATSAPP
  status        enum           product_variants
  total         numeric(10,2)    id            pk
  paymentRef    null             size
  createdAt                      colour
                                 stock         int default 0
order_items                      productId     fk → products
  id            pk                             (on delete cascade)
  orderId       fk → orders                    unique(product,size,colour)
                (on delete cascade)
  variantId     fk → product_variants
  productName   ← copied at purchase time
  size, colour  ← copied at purchase time
  unitPrice     numeric(10,2)  ← copied at purchase time
  quantity      int
```

Relationships: a category has many products; a product has many variants
(eager, cascade); a user has many orders; an order has many items (eager,
cascade); each item points at the variant it sold.

Key points:

- **`product_variants` is the stock-keeping unit.** A unique constraint on
  `(product, size, colour)` stops duplicates. Stock lives here, not on the
  product, which is what makes "Linen Dress, Sage, size M" independently
  sellable.
- **Order items denormalise what they sold.** `productName`, `size`, `colour`
  and `unitPrice` are copied onto `order_items` at checkout. Renaming a product
  or changing its price later never rewrites history, so an old invoice still
  reads correctly.
- **Variants are never deleted.** `order_items.variantId` is a non-nullable FK,
  so deleting a variant would orphan past orders. The product update path adds
  and updates variants but never removes them; retiring one means setting stock
  to 0. Products are likewise soft-hidden via `isActive`, which is what
  `DELETE /api/products/:id` does.
- **`imagePublicId` tracks ownership of the image.** `imageUrl` is what the
  storefront renders; `imagePublicId` records the Cloudinary asset behind it so
  a replaced image can be deleted rather than orphaned. It is null for an
  externally hosted URL pasted by hand, which is exactly the signal that the app
  must not try to delete that asset. The seeded demo products ship with
  Cloudinary images, so replacing one cleans up after itself.
- **Money is `numeric(10,2)`, not float.** Postgres returns `numeric` as a
  string, so a small transformer (`common/decimal.transformer.ts`) parses it
  back to a number on read.
- **Order numbers** are human-quotable (`ORD-xxxxxxxxxx`) and unique, separate
  from the surrogate `id`.

---

## 5. Important technical decisions

**Stock is decremented atomically, inside a transaction.**
`OrdersService.create` runs the whole checkout in one `dataSource.transaction`.
The decrement is a conditional UPDATE — `decrement(ProductVariant, { id, stock:
MoreThanOrEqual(quantity) }, 'stock', quantity)` — and the service checks
`affected`. If two customers race for the last item, one UPDATE matches zero
rows, that request throws, and the transaction rolls back. This avoids the
read-then-write race that a `SELECT` followed by a `SAVE` would have.

**Prices are always recomputed server-side.** The client shows a price preview,
but `POST /api/orders` accepts only `variantId` and `quantity`. Unit price, bulk
tier and order total are derived from the database, so a tampered request cannot
buy a dress for 1 rupee.

**Bulk pricing pools quantity per product, not per variant.** Six black tees and
four white tees of the same product count as ten toward that product's
`bulkMinQty`. The rule lives in `OrdersService.unitPrice`, and the frontend
mirrors it in `lib/format.ts` purely to preview the discount. The server's
figure is authoritative.

**Order status is a state machine.** A `TRANSITIONS` table defines the legal
moves (`PENDING → CONFIRMED | CANCELLED`, `SHIPPED → DELIVERED`, and so on), so
an order cannot jump from `PENDING` to `DELIVERED`. Cancelling returns stock to
inventory in a transaction. The admin UI mirrors the same table and only renders
buttons the server will accept — the check is enforced on the server regardless.

**Two payment paths, because that matches how the market actually buys.**
*PayHere* for cards: the server builds the signed field set, the browser POSTs it
to PayHere's hosted checkout, and the order is marked `PAID` only by the
server-to-server `notify` callback. *WhatsApp* for the rest: the server builds a
pre-filled message and the order stays `PENDING` until an admin confirms it.

**Images upload straight from the browser to Cloudinary, not through the API.**
The admin asks `POST /api/uploads/signature` for a short-lived signature, then
the browser POSTs the file directly to Cloudinary. The API secret never leaves
the server, no image bytes transit the API (so no multer, no body-size limits,
no memory pressure), and the database stores only the resulting URL plus the
asset id. The signature is computed by hand with `node:crypto`, mirroring how
`PayhereService` already signs PayHere requests, so no SDK dependency was added.

Because Cloudinary requires *every* parameter it receives to be covered by the
signature, a client cannot append extra parameters — altering the folder or the
public id invalidates the hash and Cloudinary rejects the upload. Deleting the
replaced asset happens only *after* the product row is saved, so a failed save
can never delete an image that is still referenced, and a failed delete is
logged rather than thrown.

**The client never computes a shipping fee.** The backend's `total` is the sum of
line items, so the UI shows delivery as free island-wide rather than inventing a
figure that would disagree with the stored order and the amount sent to PayHere.

**`Relation<T>` on circular entity relations.** `ProductVariant` and `Product`
import each other. Under ESM, the decorator metadata TypeScript emits for
`product: Product` evaluates `Product` before it is initialised and throws
`Cannot access 'Product' before initialization`. Wrapping it as
`Relation<Product>` suppresses that eager reference.

**The URL holds the catalog filter state.** Category, size, price range, sort and
search live in the query string, so a filtered view survives a refresh, works
with the back button, and can be shared or linked to from the home page.

---

## 6. Security approach

- **Passwords** are hashed with bcrypt (cost 10) and the column is
  `select: false`, so a normal `find` can never leak a hash. The one place that
  needs it uses an explicit query.
- **Login is deliberately vague.** A wrong email and a wrong password return the
  same `Invalid email or password`, so the endpoint can't be used to enumerate
  registered addresses. It is also rate-limited to 5 attempts/minute on top of
  the global 100/minute throttle.
- **Authorization is checked on the server for every protected route.**
  `JwtAuthGuard` + `RolesGuard` with `@Roles(Role.ADMIN)` guard the admin
  endpoints. `GET /api/orders/:id` additionally verifies ownership — a customer
  requesting someone else's order gets `404`, not `403`, so the response does
  not confirm that the order exists. The frontend's route guards are purely
  cosmetic; removing them in devtools grants nothing.
- **Input validation is global and strict.** `ValidationPipe` runs with
  `whitelist: true` and `forbidNonWhitelisted: true`, so unknown properties are
  rejected rather than silently ignored — a request cannot smuggle `role: ADMIN`
  or `isActive` into a DTO that does not declare it. `transform: true` coerces
  query params to their declared types.
- **No privilege escalation path.** `RegisterUserDto` has no `role` field, and
  the column defaults to `CUSTOMER`. Admins exist only via the seeded account or
  a direct database change.
- **Payment callbacks are verified, not trusted.** `handlePayhereNotify`
  recomputes the MD5 signature from the merchant secret and rejects a mismatch,
  confirms the merchant id, and checks that `payhere_amount` equals the stored
  order total before marking it paid. It also ignores a notification for an
  order that is no longer `PENDING`, which makes a replayed callback a no-op.
  The merchant secret stays server-side — the browser only ever sees the
  already-computed hash.
- **Upload signing is admin-gated and short-lived.** `POST /api/uploads/signature`
  sits behind `JwtAuthGuard` + `RolesGuard` with `@Roles(Role.ADMIN)` and is
  throttled to 30/minute. The signature embeds a Unix timestamp, which
  Cloudinary rejects once stale, so a leaked signature is not a durable upload
  credential. The API secret is only ever used server-side to compute hashes.
- **SQL injection** is avoided by parameterised queries everywhere, including
  the one raw `EXISTS` fragment in the size filter, which binds `:size`.
- **Transport and headers:** `helmet()` sets the standard security headers, and
  CORS is restricted to `FRONTEND_URL` rather than `*`.
- **Secrets** come from the environment. `.env` is gitignored; `.env.example`
  documents the keys with no values.

### Known security limitations

- **The JWT is stored in `localStorage`**, which is readable by any script on the
  origin and so is vulnerable to XSS. React escapes interpolated content by
  default and the app has no `dangerouslySetInnerHTML`, but an httpOnly,
  SameSite cookie with CSRF protection would be the stronger design. It was not
  used here because the SPA and API are served from different origins in
  development.
- **Tokens cannot be revoked.** There is no refresh-token rotation, no
  server-side session store and no logout-everywhere; signing out only clears
  local storage. A stolen token is valid until it expires.
- **No password reset, email verification, or account lockout.**

---

## 7. Assumptions and limitations

**Assumptions**

- Single currency (LKR) and a single-country market (Sri Lanka). The phone
  validator accepts Sri Lankan mobile numbers only.
- Checkout requires an account, so every order has an owner and order history
  works. There is no guest checkout.
- One image per product. Uploads go to Cloudinary and the database stores the
  URL plus the asset id; pasting an external URL by hand is still supported as a
  fallback. There is no multi-image gallery.
- A customer who chooses WhatsApp will complete payment out of band; an admin
  then confirms the order by hand.
- Delivery is free island-wide, so there is no shipping-cost engine, tax engine
  or discount-code system.

**Limitations**

- **`synchronize: true`** keeps the schema in step with the entities, which is
  convenient for development but unsafe for production. Real deployments need
  generated migrations.
- **Stock is reserved only at order creation**, not while an item sits in the
  cart. A cart can therefore fail at checkout if the last piece sells first —
  the server rejects it with a clear message rather than overselling.
- **PayHere is sandbox-oriented and needs credentials.** With
  `PAYHERE_MERCHANT_ID` unset, the order is still created but the redirect
  cannot complete; the UI detects the missing merchant id and shows the order
  instead of a broken gateway. The `notify` callback also cannot reach
  `localhost`, so during local development a card order stays `PENDING` until an
  admin moves it. Testing the real callback needs a public tunnel.
- **File type and size are only checked in the browser** (JPEG/PNG/WebP/AVIF,
  5 MB). A signed upload goes straight to Cloudinary, so the API cannot inspect
  the bytes. Enforce real limits in the Cloudinary account settings, or switch
  to an upload preset with `allowed_formats` and a max file size.
- **Orphaned assets are still possible.** If an admin uploads an image and then
  abandons the form without saving, the file stays in Cloudinary with nothing
  referencing it. Only a *replaced* image is cleaned up. A periodic sweep
  comparing the Cloudinary folder against `products.imagePublicId` would close
  that gap.
- **No pagination.** Product and order lists return every row. That is fine at
  demo scale and would need cursor pagination for a real catalog.
- **Categories can be created and listed, but not renamed or deleted,** because
  the API exposes no such endpoint and deleting one would orphan products.
- **Saved variants cannot be renamed or removed** through the admin UI, for the
  referential-integrity reason described above. The form disables those fields
  and explains why.
- **Light theme only.** `color-scheme: light` is set explicitly so native
  controls render correctly; a dark theme was scoped out rather than shipped
  half-tested.
- **Testing.** The API was verified end to end by exercising the live endpoints
  (register, order creation with strict-validation payloads, admin product
  create/update with mixed new and existing variants, and a status transition).
  The frontend type-checks and builds clean. There is no automated test suite —
  the Vitest scaffold in `backend/` is unused, and no browser-level UI
  verification was performed.

---

## 8. Design notes

The storefront aims for the restrained look of a contemporary fashion label:
warm off-white ground, near-black ink, a single clay accent used only for bulk
pricing and alerts, a serif display face against a neutral UI face, and generous
whitespace. Product imagery carries the colour.

Practical UX decisions worth calling out:

- **Variant selection is two-step** (colour, then size) and sizes that are out of
  stock for the chosen colour are struck through rather than hidden, so the page
  shows what exists and what is merely unavailable.
- **The bulk tier is surfaced before it applies** — the product page tells you
  how many more pieces unlock the lower price, and the cart badges lines that
  are already benefiting.
- **Loading states are shaped like their content** (image-and-two-lines
  skeletons for the grid, row skeletons for tables) instead of a spinner, so
  layout does not jump.
- **Every list has a designed empty state** with the action that resolves it.
- **Responsive down to 360px**: the catalog filters collapse behind a toggle, the
  nav becomes a drawer, admin tables scroll horizontally rather than squashing,
  and tap targets stay at least 44px.
- **Accessibility:** semantic landmarks, labelled icon-only buttons,
  `aria-pressed` on filter chips, visible focus rings, `aria-live` toasts, and a
  `prefers-reduced-motion` block that disables animation.
