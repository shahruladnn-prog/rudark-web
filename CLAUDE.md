# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
```

No test suite is configured. Validate changes by running `npm run build` for type errors and by testing in the browser.

## Architecture Overview

**Rudark PRO SHOP** — a Malaysian e-commerce platform for technical gear, built on Next.js App Router with Firebase as the backend.

### Key Data Flow

```
Browser → Server Actions (actions/) → Firebase Admin SDK → Firestore
                                    → Loyverse API (POS/inventory)
                                    → ParcelAsia API (shipping)
                                    → CHIP payment gateway
```

The app makes heavy use of `'use server'` Server Actions for all mutations. There are no traditional API routes for business logic — everything flows through `actions/`.

### Directory Layout

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages and API routes |
| `app/api/` | Several API routes including `/api/stock`, `/api/webhooks/chip`, and secured admin endpoints. |
| `actions/` | All server-side business logic (~43 files); direct Firebase Admin access |
| `components/` | React components; admin components under `components/admin/` |
| `context/cart-context.tsx` | Client-side cart state backed by localStorage |
| `lib/` | Firebase client/admin init, Loyverse API client, serialization helpers |
| `types/index.ts` | Central TypeScript types: `Product`, `CartItem`, `Category`, `Order`, `StoreSettings` |
| `functions/` | Firebase Cloud Functions (separate deploy from Next.js) |

### Firestore Collections

`products`, `orders`, `categories`, `settings`, `shipping_settings`, `payment_settings`, `promo_codes`, `consignments`, `stock_movements`, `stock_transfers`, `stock_audit`

Order status lifecycle: `PENDING → PAID → SHIPPED → DELIVERED`

### Stock Management

Stock validation uses **atomic Firestore transactions** to prevent overselling. The flow: validate cart → reserve stock → create pending order → trigger payment. Never skip the transaction pattern when writing stock-mutating actions.

Variant-level stock is tracked by matching option values. Loyverse (POS) is the source of truth for physical inventory; `actions/sync-stock.ts` and `actions/check-loyverse-stock.ts` bridge Firestore ↔ Loyverse.

### Payment Processing

Primary gateway: **CHIP** (`actions/payment-processors/chip.ts`). The webhook at `/api/webhooks/chip` verifies RSA-SHA256 signatures before processing. CHIP requires prices in cents and does not accept negative line items — discounts are distributed proportionally across items.

Environment variable `CHIP_TEST_SECRET_KEY` vs `CHIP_LIVE_SECRET_KEY` controls test/live mode.

### Caching Strategy

- `/api/stock` returns `Cache-Control: s-maxage=30, stale-while-revalidate=300` for client-side stock display
- Admin mutations call `revalidatePath()` to bust ISR caches on demand
- Home page fetches are timeout-protected (5s) with graceful fallback to avoid cold-start timeouts on Vercel

### Firebase Initialization

Both `lib/firebase.ts` (client) and `lib/firebase-admin.ts` (server) use a singleton pattern with a global cache check to avoid re-initialization across hot reloads. Always use these modules — never initialize Firebase inline.

Firestore timestamps must be serialized before passing to Client Components; use `lib/serialize-firestore.ts`.

### Path Alias

`@/*` maps to the project root. Use `@/lib/...`, `@/components/...`, `@/types`, etc.

## Environment Variables

Required in `.env.local`:

```
# Firebase client
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase Admin (server-side)
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

# Admin TOTP
TOTP_ENCRYPTION_KEY

# Third-party APIs
LOYVERSE_API_TOKEN
PARCELASIA_API_KEY

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Deployment

Hosted on Vercel (`rudark-web.vercel.app`). Firebase Cloud Functions in `functions/` are deployed separately via `firebase deploy --only functions`.

Next.js config sets a 10 MB Server Actions body limit (for image uploads) and whitelists Firebase Storage and Google User Content as remote image sources.
