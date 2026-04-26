'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';
import { processSuccessfulOrder } from './order-utils';
import { logAdminAction } from './admin-log-actions';

export interface OrderFilter {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    /** Page size for cursor pagination (default 30). Ignored in search mode. */
    pageSize?: number;
    /** Opaque base64 cursor from the previous OrdersPage.nextCursor. Null = first page. */
    cursor?: string | null;
}

export interface OrdersPage {
    orders: OrderSummary[];
    /** Pass to next getOrders call to fetch the following page. Null = no more pages. */
    nextCursor: string | null;
    /** True when operating in search mode (client-side filter over a bounded fetch). */
    searchMode: boolean;
}

// ---------- cursor helpers ----------
function encodeCursor(createdAt: Date | undefined, docId: string): string {
    return Buffer.from(JSON.stringify({
        t: createdAt?.toISOString() ?? '',
        id: docId,
    })).toString('base64url');
}

function decodeCursor(cursor: string): { t: string; id: string } | null {
    try {
        return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch { return null; }
}

export interface OrderLineItem {
    name: string;
    sku?: string;
    quantity: number;
    price: number;
    promo_price?: number;
    selected_options?: Record<string, string>;
}

export interface OrderSummary {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    status: string;
    payment_status?: string;
    payment_method?: string;
    total_amount: number;
    items_count: number;
    items: OrderLineItem[];
    delivery_method: string;
    tracking_no?: string;
    type?: string;
    created_at: string;
    updated_at?: string;
}

/**
 * Get all orders with optional filtering
 */
/**
 * Helper to map Firestore doc to OrderSummary
 */
function mapDocToSummary(doc: any): OrderSummary {
    const data = doc.data();
    return {
        id: doc.id,
        customer_name: data.customer?.name || 'Unknown',
        customer_email: data.customer?.email || '',
        customer_phone: data.customer?.phone || '',
        status: data.status || 'UNKNOWN',
        payment_status: data.payment_status,
        payment_method: data.payment_method,
        total_amount: data.total_amount || 0,
        items_count: data.items?.length || 0,
        items: (data.items || []).map((item: any) => ({
            name: item.name || item.product_name || 'Unknown',
            sku: item.sku,
            quantity: item.quantity || 1,
            price: item.web_price ?? item.price ?? 0,
            promo_price: item.promo_price,
            selected_options: item.selected_options,
        })),
        delivery_method: data.type === 'POS' ? 'POS Sale' : (data.delivery_method || 'delivery'),
        tracking_no: data.tracking_no,
        type: data.type,
        created_at: data.created_at?.toDate?.().toISOString() || data.created_at || '',
        updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || ''
    };
}

/**
 * Fetch orders with true Firestore cursor pagination (browse mode) or
 * a bounded client-side-filtered fetch (search mode).
 *
 * Browse mode  — no `search` set:
 *   Uses .orderBy('created_at','desc').orderBy(__name__,'desc') + .startAfter()
 *   so each page is exactly `pageSize` Firestore reads.
 *
 * Search mode  — `search` is set:
 *   Fetches up to 500 docs in the date/status window + runs targeted exact-match
 *   queries in parallel, merges, then filters client-side.  `cursor` is ignored.
 */
export async function getOrders(filter: OrderFilter = {}): Promise<OrdersPage> {
    await requireRole(['owner', 'staff']);

    try {
        const { status, search, dateFrom, dateTo, pageSize = 30, cursor } = filter;

        // ── SEARCH MODE ──────────────────────────────────────────────────────
        if (search?.trim()) {
            const term = search.trim();
            const ordersMap = new Map<string, OrderSummary>();

            let baseQ: any = adminDb.collection('orders').orderBy('created_at', 'desc');
            if (status && status !== 'all') baseQ = baseQ.where('status', '==', status);
            if (dateFrom) baseQ = baseQ.where('created_at', '>=', new Date(dateFrom));
            if (dateTo) {
                const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                baseQ = baseQ.where('created_at', '<=', to);
            }

            const [baseSnap, idSnap, trackingSnap, phoneSnap] = await Promise.all([
                baseQ.limit(500).get().catch(() => ({ docs: [] })),
                adminDb.collection('orders').doc(term).get().catch(() => ({ exists: false })),
                adminDb.collection('orders').where('tracking_no', '==', term).get()
                    .catch(() => ({ docs: [] })),
                adminDb.collection('orders').where('customer.phone', '==', term).get()
                    .catch(() => ({ docs: [] })),
            ]);

            const addDoc = (doc: any) => {
                if (!doc.exists) return;
                const s = mapDocToSummary(doc);
                if (status && status !== 'all' && s.status !== status) return;
                ordersMap.set(s.id, s);
            };

            (baseSnap as any).docs?.forEach(addDoc);
            addDoc(idSnap);
            (trackingSnap as any).docs?.forEach(addDoc);
            (phoneSnap as any).docs?.forEach(addDoc);

            const q = term.toLowerCase();
            const orders = Array.from(ordersMap.values())
                .filter(o =>
                    o.id.toLowerCase().includes(q) ||
                    o.customer_name.toLowerCase().includes(q) ||
                    o.customer_email.toLowerCase().includes(q) ||
                    o.customer_phone.includes(q) ||
                    (o.tracking_no && o.tracking_no.toLowerCase().includes(q))
                )
                .sort((a, b) => orderTimestamp(b) - orderTimestamp(a));

            return { orders, nextCursor: null, searchMode: true };
        }

        // ── BROWSE MODE (cursor pagination) ──────────────────────────────────
        // Use a composite sort so startAfter is deterministic even when
        // two orders share the same created_at millisecond.
        let query: any = adminDb
            .collection('orders')
            .orderBy('created_at', 'desc')
            .orderBy(FieldPath.documentId(), 'desc');

        if (status && status !== 'all') query = query.where('status', '==', status);
        if (dateFrom) query = query.where('created_at', '>=', new Date(dateFrom));
        if (dateTo) {
            const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
            query = query.where('created_at', '<=', to);
        }

        // Apply cursor from previous page
        if (cursor) {
            const decoded = decodeCursor(cursor);
            if (decoded?.t) {
                query = query.startAfter(new Date(decoded.t), decoded.id);
            }
        }

        // Fetch one extra to detect whether there is a next page
        const snap = await query.limit(pageSize + 1).get();
        const hasMore = snap.docs.length > pageSize;
        const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

        const orders = docs.map(mapDocToSummary);
        const lastDoc = docs[docs.length - 1];
        const nextCursor = hasMore && lastDoc
            ? encodeCursor(lastDoc.data()?.created_at?.toDate(), lastDoc.id)
            : null;

        return { orders, nextCursor, searchMode: false };

    } catch (error) {
        console.error('[getOrders] Error:', error);
        return { orders: [], nextCursor: null, searchMode: false };
    }
}

/** Stable sort key for order — falls back to ID-embedded timestamp */
function orderTimestamp(o: OrderSummary): number {
    if (o.created_at) { const d = new Date(o.created_at).getTime(); if (!isNaN(d)) return d; }
    if (o.updated_at) { const d = new Date(o.updated_at).getTime(); if (!isNaN(d)) return d; }
    const m = o.id.match(/ORD-(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
}

/**
 * Helper to convert Firebase Timestamps to ISO strings recursively
 */
function serializeTimestamps(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    // Check if it's a Firebase Timestamp
    if (obj && typeof obj.toDate === 'function') {
        return obj.toDate().toISOString();
    }

    // Handle Date objects
    if (obj instanceof Date) {
        return obj.toISOString();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(serializeTimestamps);
    }

    // Handle plain objects
    if (typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = serializeTimestamps(obj[key]);
            }
        }
        return result;
    }

    return obj;
}

/**
 * Get a single order by ID
 */
export async function getOrderById(orderId: string) {
    await requireRole(['owner', 'staff']);

    try {
        const doc = await adminDb.collection('orders').doc(orderId).get();
        if (!doc.exists) return null;

        const data = doc.data()!;

        // Serialize all Timestamp fields to avoid Next.js serialization errors
        const serializedData = serializeTimestamps(data);

        return {
            id: doc.id,
            ...serializedData
        };
    } catch (error) {
        console.error('[getOrderById] Error:', error);
        return null;
    }
}

// ── Counter doc helpers (task 8.4) ──────────────────────────────────────────
const COUNTER_REF = () => adminDb.collection('stats').doc('order_counts');

/**
 * Atomically transition an order's status and update the counter doc.
 * Reading the order inside the transaction ensures the counter stays in sync
 * even under concurrent updates.
 */
export async function updateOrderStatus(orderId: string, newStatus: string, trackingNumber?: string) {
    await requireRole(['owner', 'staff']);

    try {
        const historyEntry: Record<string, string> = {
            status: newStatus,
            timestamp: new Date().toISOString(),
        };
        if (trackingNumber) historyEntry.tracking_no = trackingNumber;

        const updateData: any = {
            status: newStatus,
            updated_at: new Date(),
            status_history: FieldValue.arrayUnion(historyEntry),
        };
        if (trackingNumber) updateData.tracking_number = trackingNumber;

        await adminDb.runTransaction(async (tx) => {
            const orderRef = adminDb.collection('orders').doc(orderId);
            const orderSnap = await tx.get(orderRef);
            const oldStatus: string | undefined = orderSnap.data()?.status;

            tx.update(orderRef, updateData);

            // Maintain status counters
            const counterDelta: Record<string, any> = {};
            if (oldStatus && oldStatus !== newStatus) {
                counterDelta[`counts.${oldStatus}`] = FieldValue.increment(-1);
            }
            counterDelta[`counts.${newStatus}`] = FieldValue.increment(1);
            tx.set(COUNTER_REF(), counterDelta, { merge: true });
        });

        await logAdminAction('STATUS_CHANGE', 'order', orderId, { newStatus, trackingNumber });
        return { success: true };
    } catch (error: any) {
        console.error('[updateOrderStatus] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateOrderStatus(orderIds: string[], newStatus: string) {
    await requireRole(['owner', 'staff']);

    try {
        // Run in a transaction so counter stays accurate
        await adminDb.runTransaction(async (tx) => {
            const orderRefs = orderIds.map(id => adminDb.collection('orders').doc(id));
            const orderSnaps = await Promise.all(orderRefs.map(r => tx.get(r)));

            const now = new Date();
            const counterDelta: Record<string, any> = {};

            orderSnaps.forEach((snap, i) => {
                const oldStatus: string | undefined = snap.data()?.status;
                tx.update(orderRefs[i], { status: newStatus, updated_at: now });

                if (oldStatus && oldStatus !== newStatus) {
                    counterDelta[`counts.${oldStatus}`] = FieldValue.increment(-1);
                }
            });
            counterDelta[`counts.${newStatus}`] = FieldValue.increment(orderIds.length);

            tx.set(COUNTER_REF(), counterDelta, { merge: true });
        });

        await logAdminAction('BULK_STATUS_CHANGE', 'order', orderIds.join(','), { newStatus, count: orderIds.length });
        return { success: true, updated: orderIds.length };
    } catch (error: any) {
        console.error('[bulkUpdateOrderStatus] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * One-time initialiser: rebuilds the stats/order_counts doc from a full collection
 * scan.  Call from the admin dashboard or a migration script — safe to run multiple
 * times (it overwrites, not increments).
 */
export async function initOrderCounters() {
    await requireRole(['owner', 'staff']);

    try {
        const snap = await adminDb.collection('orders').select('status').get();
        const counts: Record<string, number> = {};
        snap.docs.forEach((doc: any) => {
            const s: string = doc.data().status || 'UNKNOWN';
            counts[s] = (counts[s] || 0) + 1;
        });
        await adminDb.collection('stats').doc('order_counts').set({ counts }, { merge: false });
        return { success: true, counts };
    } catch (error: any) {
        console.error('[initOrderCounters] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get order statistics for the orders list page (scoped to current filter window)
 */
export async function getOrderStats(dateFrom?: string, dateTo?: string) {
    await requireRole(['owner', 'staff']);

    try {
        let query: any = adminDb.collection('orders').orderBy('created_at', 'desc');

        if (dateFrom) query = query.where('created_at', '>=', new Date(dateFrom));
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            query = query.where('created_at', '<=', to);
        }

        const snapshot = await query.limit(500).get();

        const stats = {
            total: 0, pending: 0, paid: 0, shipped: 0,
            completed: 0, cancelled: 0, totalRevenue: 0
        };

        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            stats.total++;
            switch (data.status?.toUpperCase()) {
                case 'PENDING': case 'PENDING_PAYMENT': stats.pending++; break;
                case 'PAID':
                    stats.paid++; stats.totalRevenue += (data.total_amount || 0); break;
                case 'SHIPPED': case 'READY_TO_SHIP':
                    stats.shipped++; stats.totalRevenue += (data.total_amount || 0); break;
                case 'COMPLETED': case 'DELIVERED':
                    stats.completed++; stats.totalRevenue += (data.total_amount || 0); break;
                case 'CANCELLED': case 'REFUNDED': stats.cancelled++; break;
            }
        });

        return stats;
    } catch (error) {
        console.error('[getOrderStats] Error:', error);
        return { total: 0, pending: 0, paid: 0, shipped: 0, completed: 0, cancelled: 0, totalRevenue: 0 };
    }
}

/**
 * Dashboard stats.
 *
 * Reads:
 *   1. stats/order_counts  — single doc for PAID count (O(1) instead of O(n))
 *   2. orders where created_at >= todayStart — today's revenue (small, date-scoped)
 *   3. orders where status==PAID && created_at < stuckCutoff — stuck orders
 *   4. last 5 orders — recent feed (5 doc reads)
 *
 * Falls back gracefully if the counter doc doesn't exist yet (call
 * initOrderCounters() once to seed it).
 */
export async function getDashboardStats() {
    await requireRole(['owner', 'staff']);

    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const stuckCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [counterSnap, todaySnap, stuckSnap, recentSnap] = await Promise.all([
            COUNTER_REF().get(),
            adminDb.collection('orders').where('created_at', '>=', todayStart).get(),
            adminDb.collection('orders')
                .where('status', '==', 'PAID')
                .where('created_at', '<', stuckCutoff)
                .get(),
            adminDb.collection('orders').orderBy('created_at', 'desc').limit(5).get(),
        ]);

        // PAID count from counter doc (1 read) — fallback to 0 if not seeded yet
        const counts: Record<string, number> = counterSnap.exists
            ? (counterSnap.data()?.counts ?? {})
            : {};
        const paidCount = counts['PAID'] ?? 0;

        const todayRevenue = todaySnap.docs.reduce(
            (sum: number, doc: any) => sum + (doc.data().total_amount || 0), 0
        );

        return {
            today: { orders: todaySnap.size, revenue: todayRevenue },
            pending: { shipment: paidCount, stuck: stuckSnap.size },
            recentOrders: recentSnap.docs.map(mapDocToSummary),
            countersSeeded: counterSnap.exists,
        };
    } catch (error) {
        console.error('[getDashboardStats] Error:', error);
        return {
            today: { orders: 0, revenue: 0 },
            pending: { shipment: 0, stuck: 0 },
            recentOrders: [],
            countersSeeded: false,
        };
    }
}

/**
 * Manually reprocess an order - triggers Loyverse sync, ParcelAsia shipment, etc.
 * Use when webhook fails (e.g., local development) or needs manual retry
 */

/**
 * Manually reprocess an order - triggers Loyverse sync, ParcelAsia shipment, etc.
 * Use when webhook fails (e.g., local development) or needs manual retry
 */
export async function reprocessOrder(orderId: string) {
    await requireRole(['owner', 'staff']);

    try {
        console.log(`[Reprocess] Starting manual reprocess for order: ${orderId}`);

        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const orderData = orderDoc.data();

        // Update status to PAID first if still PENDING
        if (orderData?.status === 'PENDING' || orderData?.status === 'PENDING_PAYMENT') {
            await orderRef.update({
                status: 'PAID',
                payment_status: 'paid',
                payment_method: 'MANUAL_REPROCESS',
                updated_at: new Date()
            });
            console.log(`[Reprocess] Updated order status to PAID`);
        }

        // Call processSuccessfulOrder to trigger all integrations
        const result = await processSuccessfulOrder(orderId);

        if (result.success) {
            console.log(`[Reprocess] Order ${orderId} reprocessed successfully`);
            return { success: true, message: 'Order reprocessed successfully' };
        } else {
            console.error(`[Reprocess] Order ${orderId} reprocess failed:`, result.error);
            return { success: false, error: result.error };
        }

    } catch (error) {
        console.error('[Reprocess] Error:', error);
        return { success: false, error: 'Reprocess failed' };
    }
}
