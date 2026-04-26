# Rudark PRO SHOP — Gemini CLI Context

## Project Summary
**Rudark PRO SHOP** — Malaysian e-commerce platform for technical/adventure gear. Built on **Next.js 15 App Router** with **Firebase** as backend.

## Tech Stack
- **Framework**: Next.js 15, App Router, TypeScript, Tailwind CSS
- **Backend**: Firebase Admin SDK (Firestore), Firebase Storage
- **Auth**: Firebase Auth
- **Payment**: CHIP gateway (`actions/payment-processors/chip.ts`)
- **POS/Inventory**: Loyverse API
- **Shipping**: ParcelAsia API
- **Error tracking**: Sentry

## Key Data Flow
```
Browser → Server Actions (actions/) → Firebase Admin SDK → Firestore (MASTER BRAIN)
                                    → Loyverse API (POS/inventory)
                                    → CHIP payment gateway
```

Firebase is the **Source of Truth** for inventory across all channels (Web, POS, Marketplaces).

## Directory Layout
| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages |
| `actions/` | All server-side business logic — direct Firebase Admin access |
| `components/admin/` | High-density industrial admin components |
| `lib/` | Firebase client/admin init, Loyverse API, serialization helpers |
| `types/index.ts` | Central TypeScript types (Product, Order, Blog, etc.) |

## Critical Patterns

### Atomic Stock Operations
Stock mutations MUST use Firestore transactions.
- **FIFO Tracking:** Sales deduct from the oldest `cost_lots` first.
- **Shadow Orders:** POS sales from Loyverse are imported as shadow orders (`type: 'POS'`) for unified reporting.

### Admin Pages Pattern
- **Industrial Design:** High-density tables, collapsible sidebar sub-menus.
- **Terminal Mode:** F2 toggles barcode-optimized scan mode in POS terminal (`/admin/pos`).
- **Visibility Control:** Granular toggles for `is_public` (Store) and `is_home_public` (Homepage).
- **Payment Mapping:** Settings UI to map Loyverse payment IDs to readable labels.

### Content Management
- **Blog:** Minimal Firestore-based system with Markdown support and JSON-LD SEO.

## Remaining Tasks (Priority Order)

### High Priority
1. **4.7** — Shopee Seller API integration: push stock, pull orders.
2. **4.8** — Lazada Open Platform integration: push stock, pull orders.
3. **4.9** — TikTok Shop MY integration: push stock, pull orders.

### Medium Priority (Firebase Functions)
4. **3.7** — Daily summary email enhancement: include POS vs Web breakdown.
5. **5.4** — WhatsApp notifications: trigger on status change.
6. **7.4** — Scheduled Firestore exports.

## Environment Variables (reference)
```
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
NEXT_PUBLIC_FIREBASE_API_KEY
LOYVERSE_API_TOKEN
PARCELASIA_API_KEY
TOTP_ENCRYPTION_KEY
```

## Important Notes
- **Timezone:** Always use `Asia/Kuala_Lumpur` for POS and order timestamps.
- **Price Integrity:** Force capture prices from variants during sync; avoid hardcoded RM 0 fallbacks.
- **Visibility:** New synced items default to `is_public: false` for review.
- **Deployment:** New composite indexes require `firebase deploy --only firestore:indexes`.
