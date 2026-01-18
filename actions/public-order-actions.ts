'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Get order status for public display
 * This uses Admin SDK so it bypasses Firestore security rules
 * Only returns safe fields that customers should see
 */
export async function getPublicOrderStatus(orderId: string) {
    try {
        if (!orderId || typeof orderId !== 'string') {
            return { success: false, error: 'Invalid order ID' };
        }

        // Sanitize order ID (prevent injection)
        const sanitizedId = orderId.replace(/[^a-zA-Z0-9-_]/g, '');
        if (sanitizedId !== orderId) {
            return { success: false, error: 'Invalid order ID format' };
        }

        const orderRef = adminDb.collection('orders').doc(sanitizedId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data();
        if (!order) {
            return { success: false, error: 'Order data missing' };
        }

        // Return only safe fields for public display
        // DO NOT expose sensitive fields like payment details, chip_purchase_id, etc.
        return {
            success: true,
            order: {
                id: sanitizedId,
                status: order.status || 'UNKNOWN',
                tracking_no: order.tracking_no || null,
                shipping_status: order.shipping_status || null,
                shipping_provider: order.shipping_provider || 'jnt',
                delivery_method: order.delivery_method || 'delivery',
                items: (order.items || []).map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity,
                    web_price: item.web_price || item.price,
                    selected_options: item.selected_options || null
                })),
                subtotal: order.subtotal || 0,
                shipping_cost: order.shipping_cost || 0,
                discount_amount: order.discount_amount || 0,
                total_amount: order.total_amount || 0,
                created_at: order.created_at?.toDate?.()?.toISOString() || order.created_at,
                // Customer info (limited)
                customer_name: order.customer_name || order.customer?.name || 'Customer'
            }
        };
    } catch (error) {
        console.error('[getPublicOrderStatus] Error:', error);
        return { success: false, error: 'Failed to fetch order' };
    }
}
