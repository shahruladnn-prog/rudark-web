'use server';

import { adminDb } from '@/lib/firebase-admin';
import { processSuccessfulOrder } from './order-utils';

export interface OrderFilter {
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
}

export interface OrderSummary {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    status: string;
    payment_status?: string;
    total_amount: number;
    items_count: number;
    delivery_method: string;
    tracking_no?: string;
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
        total_amount: data.total_amount || 0,
        items_count: data.items?.length || 0,
        delivery_method: data.delivery_method || 'delivery',
        tracking_no: data.tracking_no,
        created_at: data.created_at?.toDate?.().toISOString() || data.created_at || '',
        updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || ''
    };
}

/**
 * Get all orders with optional filtering
 */
export async function getOrders(filter: OrderFilter = {}): Promise<OrderSummary[]> {
    try {
        const { status, search, dateFrom, dateTo, limit = 50 } = filter;
        const ordersMap = new Map<string, OrderSummary>();

        // 1. Base Query (Recent Orders via Pagination strategy)
        let query: any = adminDb.collection('orders').orderBy('created_at', 'desc');

        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        // Apply Date Filters to Base Query
        if (dateFrom) {
            const from = new Date(dateFrom);
            query = query.where('created_at', '>=', from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            query = query.where('created_at', '<=', to);
        }

        query = query.limit(limit);

        // 2. Prepare Targeted Search Queries (if search is provided)
        // We catch individual errors so one failed query (e.g. missing index) doesn't break the whole page
        const searchPromises = [query.get().catch((e: any) => {
            console.error('Base query failed:', e);
            return { empty: true, docs: [] };
        })];

        if (search && search.trim()) {
            const term = search.trim();

            // Query A: Direct ID Match
            searchPromises.push(
                adminDb.collection('orders').doc(term).get()
                    .catch(() => ({ exists: false }))
            );

            // Query B: Tracking Number Match
            searchPromises.push(
                adminDb.collection('orders').where('tracking_no', '==', term).get()
                    .catch(() => ({ empty: true, docs: [] }))
            );

            // Query C: Phone Number Match (Exact)
            searchPromises.push(
                adminDb.collection('orders').where('customer.phone', '==', term).get()
                    .catch(() => ({ empty: true, docs: [] }))
            );
        }

        // 3. Execute All Queries Parallel
        const results = await Promise.all(searchPromises);

        // 4. Process Results
        const processDoc = (doc: any) => {
            if (!doc.exists) return;
            const data = mapDocToSummary(doc);

            // Filter by status if needed (for targeted results)
            if (status && status !== 'all' && data.status !== status) return;

            ordersMap.set(data.id, data);
        };

        results.forEach((res: any) => {
            if (res.docs) {
                // It's a QuerySnapshot
                res.docs.forEach(processDoc);
            } else {
                // It's a DocumentSnapshot
                processDoc(res);
            }
        });

        // Convert Map to Array
        let orders = Array.from(ordersMap.values());

        // 5. Client-side Search Refining (Fuzzy Match)
        // This keeps the "live search" feel but applied to the robust dataset
        if (search) {
            const q = search.toLowerCase();
            orders = orders.filter(o =>
                o.id.toLowerCase().includes(q) ||
                o.customer_name.toLowerCase().includes(q) ||
                o.customer_email.toLowerCase().includes(q) ||
                o.customer_phone.includes(q) ||
                (o.tracking_no && o.tracking_no.toLowerCase().includes(q))
            );
        }

        // Re-sort because merging queries might break order
        // Handle null/invalid created_at by falling back to order ID timestamp
        orders.sort((a, b) => {
            const getTimestamp = (order: OrderSummary): number => {
                // Try created_at first
                if (order.created_at) {
                    const d = new Date(order.created_at).getTime();
                    if (!isNaN(d)) return d;
                }
                // Try updated_at
                if (order.updated_at) {
                    const d = new Date(order.updated_at).getTime();
                    if (!isNaN(d)) return d;
                }
                // Extract timestamp from order ID (format: ORD-1768696998925)
                const match = order.id.match(/ORD-(\d+)/);
                if (match) return parseInt(match[1], 10);
                // Fallback to 0
                return 0;
            };
            return getTimestamp(b) - getTimestamp(a);
        });

        return orders;
    } catch (error) {
        console.error('[getOrders] Error:', error);
        return [];
    }
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

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, newStatus: string, trackingNumber?: string) {
    try {
        const updateData: any = {
            status: newStatus,
            updated_at: new Date()
        };

        if (trackingNumber) {
            updateData.tracking_number = trackingNumber;
        }

        await adminDb.collection('orders').doc(orderId).update(updateData);
        return { success: true };
    } catch (error: any) {
        console.error('[updateOrderStatus] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get order statistics (optimized - limits to recent orders)
 */
export async function getOrderStats() {
    try {
        // Limit to recent 200 orders for performance
        const snapshot = await adminDb.collection('orders')
            .orderBy('created_at', 'desc')
            .limit(200)
            .get();

        const stats = {
            total: 0,
            pending: 0,
            paid: 0,
            shipped: 0,
            completed: 0,
            cancelled: 0,
            totalRevenue: 0
        };

        snapshot.docs.forEach((doc: any) => {
            const data = doc.data();
            stats.total++;

            switch (data.status?.toUpperCase()) {
                case 'PENDING':
                case 'PENDING_PAYMENT':
                    stats.pending++;
                    break;
                case 'PAID':
                    stats.paid++;
                    stats.totalRevenue += (data.total_amount || 0);
                    break;
                case 'SHIPPED':
                case 'READY_TO_SHIP':
                    stats.shipped++;
                    stats.totalRevenue += (data.total_amount || 0);
                    break;
                case 'COMPLETED':
                case 'DELIVERED':
                    stats.completed++;
                    stats.totalRevenue += (data.total_amount || 0);
                    break;
                case 'CANCELLED':
                case 'REFUNDED':
                    stats.cancelled++;
                    break;
            }
        });

        return stats;
    } catch (error) {
        console.error('[getOrderStats] Error:', error);
        return {
            total: 0,
            pending: 0,
            paid: 0,
            shipped: 0,
            completed: 0,
            cancelled: 0,
            totalRevenue: 0
        };
    }
}

/**
 * Manually reprocess an order - triggers Loyverse sync, ParcelAsia shipment, etc.
 * Use when webhook fails (e.g., local development) or needs manual retry
 */
export async function reprocessOrder(orderId: string) {
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
