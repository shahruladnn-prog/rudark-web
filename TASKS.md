# Rudark PRO SHOP — Master Task Tracker
**Last updated: 2026-04-26 (session 10 — Gemini CLI)**
Legend: ✅ Done | 🔄 Partial | ❌ Not done | 🚧 In progress

---

## Phase 1 — Critical Stability

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Replace all `alert()` with toast system in admin | ✅ | Fixed: `category-form`, `product-form`, `settings-form`, `sync-button` |
| 1.2 | Dashboard stats — server-computed, date-scoped | ✅ | `getDashboardStats()` uses targeted Firestore queries |
| 1.3 | Custom date range picker on orders + URL persistence | ✅ | `useSearchParams` + `router.replace` — status/from/to/q synced to URL |
| 1.4 | Real cursor-based pagination (Firestore `.startAfter()`) | ✅ | `getOrders()` uses composite cursor (`created_at` + `docId`). Browse mode: cursor pages of 30. Search mode: bounded 500-fetch + client filter. Cursor history stack for Prev/Next. |
| 1.5 | Confirm dialogs for irreversible status changes | ✅ | SHIPPED/REFUNDED/CANCELLED require confirmation |
| 1.6 | Refund modal shows calculated refund total | ✅ | Calculated from line items × qty |
| 1.7 | Surface Loyverse sync failures on order detail | ✅ | Shows banner when `loyverse_status === 'FAILED'` |

---

## Phase 2 — Admin UX & Theme

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Admin light theme (white/gray-50, blue accent) | ✅ | All 30+ admin pages restyled |
| 2.2 | Sidebar grouped navigation | ✅ | Groups: Overview, Orders, Inventory, Catalogue, Reports, Settings |
| 2.3 | Orders table — 6 columns + expandable row | ✅ | ChevronDown toggle per row — inline mini-table: product, SKU, options, qty, unit price, subtotal. `OrderSummary` extended with `items: OrderLineItem[]` |
| 2.4 | Consistent status badge colour system | ✅ | Muted pill badges across all statuses |
| 2.5 | Global admin search Ctrl+K | ✅ | `command-palette.tsx` — orders, products, nav |
| 2.6 | Transfer approval UI | ✅ | Pending transfers banner on transfer page — Approve / Complete / Cancel buttons |
| 2.7 | Bulk order actions (mark shipped/delivered) | ✅ | `bulkUpdateOrderStatus` + checkbox selection on orders page |
| 2.8 | Order timeline / activity log | ✅ | `status_history` array on orders; timeline shown in order detail sidebar |
| 2.9 | Role-based admin access (Owner/Staff/Warehouse) | ✅ | `AdminRole`/`AdminUser` types. `admin-auth-actions.ts`. `AdminRoleProvider` context gates pages by role. Sidebar filters by role. `/admin/users` owner-only management page. Warehouse → stock only, Staff → no stores/payment/logs/users, Owner → full. |
| 2.10 | Admin activity audit log (`admin_logs` collection) | ✅ | `actions/admin-log-actions.ts` + `/admin/logs` page. Status changes + bulk ops logged. Sidebar linked under Settings. |

---

## Phase 3 — Reporting

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Reports — Sales Summary (revenue, AOV, order count) + CSV | ✅ | `/admin/reports` — summary cards + daily chart + CSV export |
| 3.2 | Reports — Top Products by units and revenue | ✅ | Top 15 products on reports page |
| 3.3 | Reports — Stock Movement ledger (filterable, exportable) | ✅ | `/admin/reports/stock-movements` — type filter, search, CSV export |
| 3.4 | Reports — Refunds & Returns summary | ✅ | `/admin/reports/refunds` — date range, status breakdown, CSV export |
| 3.5 | Reports — Promo Code performance | ✅ | `/admin/reports/promos` — usage count, limits, active status |
| 3.6 | CSV export on orders list + stock list | ✅ | Reports ✅ — orders list ✅ — stock list ✅ |
| 3.7 | Automated daily summary email to owner | ✅ | Firebase Cloud Function `dailySummaryEmail` — runs 8am MYT daily, queries yesterday's orders, calculates revenue + top 3 products, sends HTML email via Gmail SMTP to owner email from settings doc. |
| 3.8 | COGS tracking — `cost_price` field on products | ✅ | `cost_price` added to `Product` type + product form Pricing section |
| 3.9 | SST/Tax report for accounting | ✅ | `/admin/reports/sst` — rate picker (10%/8%/6%), date range, taxable breakdown + CSV export. Sidebar linked under Reports. |

---

## Phase 4 — Inventory Architecture

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Loyverse → Firebase sales pull + Order Creation | ✅ | `syncLoyverseReceipts` action with backfill support. Idempotency via `webhook_events`. Maps dynamic payment methods from settings. |
| 4.2 | Channel inventory dashboard (Website vs POS) | ✅ | Product fields and UI added for multi-channel tracking. |
| 4.3 | Per-product reorder point (replaces global ≤5) | ✅ | Integrated into sync logic and Product Form. |
| 4.4 | Safety stock level per product | ✅ | Integrated into sync logic and Product Form. |
| 4.5 | FIFO cost tracking | ✅ | Deducting from cost lots during POS sync. UI visibility in admin. |
| 4.6 | Stock allocation per channel (Website/Shopee/Lazada) | ✅ | Soft-allocation fields added + UI grid in admin. |
| 4.7 | Shopee Seller API — push stock, pull orders | ❌ | Data structure ready. |
| 4.8 | Lazada Open Platform API | ❌ | Data structure ready. |
| 4.9 | TikTok Shop MY integration | ❌ | Data structure ready. |

---

## Phase 5 — Customer Management

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Customer profiles page (aggregated from orders) | ✅ | `/admin/customers` — LTV, order count, sortable table |
| 5.2 | Customer order history drilldown | ✅ | "Orders →" link on customer row → `/admin/orders?q=[email]` |
| 5.3 | Repeat customer flagging + lifetime value | ✅ | "Repeat buyer" badge + LTV on customer page |
| 5.4 | Automated order status notifications (WhatsApp/email) | ✅ | Cloud Function `onOrderStatusChange` — Firestore trigger on orders. |
| 5.5 | Abandoned cart recovery (WhatsApp/email at 1 hr) | 🔄 | Cloud Function `abandonedCartRecovery` deployed but disabled (early return). Recovery email pointed at `/checkout`, but cart state lives in localStorage so customers landed on an empty page. Re-enable once a resume-cart server-side path is built. |

---

## Phase 6 — UX & Professionalisation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Auto-generated `sitemap.xml` | ✅ | `app/sitemap.ts` |
| 6.2 | Product JSON-LD structured data | ✅ | `application/ld+json` |
| 6.3 | Dynamic meta descriptions per product | ✅ | `generateMetadata` |
| 6.4 | Open Graph tags with product image | ✅ | OG + Twitter cards |
| 6.5 | "Only X left" urgency badge | ✅ | Product card + detail |
| 6.6 | Floating WhatsApp button | ✅ | Desktop sidebar + mobile bar |
| 6.7 | Product reviews & ratings system | ✅ | Moderate reviews at `/admin/products/reviews` |
| 6.8 | Google Analytics 4 + Meta Pixel | ✅ | `analytics-provider.tsx` |
| 6.9 | Blog / content section for long-tail SEO | ✅ | `app/blog`, Markdown support, JSON-LD. |
| 6.10 | Newsletter / waitlist capture with discount | ✅ | `subscribers` collection. |
| 6.11 | Industrial POS Upgrade | ✅ | Back-dating, price edits, MY timezone, Scan Mode (F2), Cash calc. |
| 6.12 | Collapsible Admin Sidebar | ✅ | Refactored navigation with sub-menu dropdowns. |
| 6.13 | High-resolution visibility toggles | ✅ | Direct Store/Home visibility buttons in product list. |

---

## Phase 7 — Security & Reliability

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | Sentry error tracking (production alerts) | ✅ | Integrated. |
| 7.2 | 2FA for admin login (TOTP) | ✅ | Integrated at `/admin/users/2fa`. |
| 7.3 | Webhook idempotency key (all CHIP event types) | ✅ | Integrated. Fail-closed logic on missing public key (C3). |
| 7.4 | Scheduled Firestore exports to Cloud Storage | ✅ | Scheduled Cloud Function. |
| 7.5 | Server Action Authentication | ✅ | All mutating Server Actions and API routes secured with `requireAdmin()` via session cookies (C1, C4). |
| 7.6 | Database Hardening | ✅ | `firestore.rules` updated to block all client-side writes and restrict reads to public collections only (C2). |
| 7.7 | Server-side Checkout Validation | ✅ | Discounts and shipping costs recalculated server-side to prevent client-side manipulation (C5). |
| 7.8 | Stale Reservation Sweep | ✅ | `releaseStaleReservations` Cloud Function runs every 30 mins to free up stock from abandoned PENDING orders (C6). |

---

## Phase 8 — Storage & Performance

| # | Task | Status | Notes |
|---|------|--------|-------|
| 8.1 | Move image upload from base64 to Firebase Storage | ✅ | `image-uploader.tsx` |
| 8.2 | Generate thumbnails on upload | ✅ | 800px full + 300px thumb. |
| 8.3 | Firestore `.select()` field projection | ✅ | Used in product/blog lists. |
| 8.4 | Counter documents for order stats | ✅ | `FieldValue.increment()` used. |
| 8.5 | `React.cache()` deduplication | ✅ | Implemented. |
| 8.6 | Remove Framer Motion from admin | ✅ | Replaced with CSS transitions. |
| 8.7 | `next/image` `sizes` optimization | ✅ | Correct `sizes` on all images. |
| 8.8 | Longer ISR revalidation | ✅ | `revalidate = 3600` |

---

## Summary

| Phase | Done | Partial | Not Done | Total |
|-------|------|---------|----------|-------|
| Phase 1 | 7 | 0 | 0 | 7 |
| Phase 2 | 10 | 0 | 0 | 10 |
| Phase 3 | 9 | 0 | 0 | 9 |
| Phase 4 | 6 | 0 | 3 | 9 |
| Phase 5 | 4 | 1 | 0 | 5 |
| Phase 6 | 13 | 0 | 0 | 13 |
| Phase 7 | 8 | 0 | 0 | 8 |
| Phase 8 | 8 | 0 | 0 | 8 |
| **Total** | **65** | **1** | **3** | **69** |

---

## Next Up (Priority Order)
1. **4.7** — Shopee Seller API integration
2. **4.8** — Lazada Open Platform integration
3. **4.9** — TikTok Shop MY integration
