'use server';

import { adminDb } from '@/lib/firebase-admin';
import { releaseReservedStock } from './stock-validation';
import { revalidatePath } from 'next/cache';

/**
 * Clean up expired reservations
 * 
 * This function finds orders that are PENDING and older than the expiry time,
 * releases their reserved stock, and marks them as EXPIRED.
 * 
 * Call this:
 * - On admin dashboard load
 * - Via scheduled Cloud Function (future)
 * - When payment webhook reports failure
 */
export async function cleanupExpiredReservations(expiryMinutes: number = 30) {
    try {
        const expiryTime = new Date(Date.now() - expiryMinutes * 60 * 1000);

        console.log(`[Stock Cleanup] Looking for PENDING orders older than ${expiryMinutes} minutes`);

        // Find expired pending orders
        const expiredOrdersSnapshot = await adminDb.collection('orders')
            .where('status', '==', 'PENDING')
            .get();

        // Filter by created_at (Firestore compound queries have limitations)
        const expiredOrders = expiredOrdersSnapshot.docs.filter(doc => {
            const data = doc.data();
            const createdAt = data.created_at?.toDate?.() || new Date(data.created_at);
            return createdAt < expiryTime;
        });

        if (expiredOrders.length === 0) {
            console.log('[Stock Cleanup] No expired reservations found');
            return { success: true, expired: 0 };
        }

        console.log(`[Stock Cleanup] Found ${expiredOrders.length} expired orders`);

        let releasedCount = 0;

        for (const orderDoc of expiredOrders) {
            const order = orderDoc.data();

            try {
                // Release the reserved stock
                if (order.items && order.items.length > 0) {
                    const releaseResult = await releaseReservedStock(order.items);

                    if (releaseResult.success) {
                        console.log(`[Stock Cleanup] Released stock for order ${orderDoc.id}`);
                    } else {
                        console.warn(`[Stock Cleanup] Failed to release stock for ${orderDoc.id}:`, releaseResult.error);
                    }
                }

                // Mark order as expired
                await orderDoc.ref.update({
                    status: 'EXPIRED',
                    expired_at: new Date(),
                    expiry_reason: 'Checkout timeout - stock released',
                    updated_at: new Date()
                });

                releasedCount++;
                console.log(`[Stock Cleanup] Marked order ${orderDoc.id} as EXPIRED`);

            } catch (orderError) {
                console.error(`[Stock Cleanup] Error processing order ${orderDoc.id}:`, orderError);
                // Continue with next order
            }
        }

        revalidatePath('/admin/orders');
        revalidatePath('/admin/stock');

        return {
            success: true,
            expired: releasedCount,
            message: `Released ${releasedCount} expired reservations`
        };

    } catch (error) {
        console.error('[Stock Cleanup] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Cleanup failed'
        };
    }
}

/**
 * Helper function to check if there are any stuck reservations
 * Returns summary without actually cleaning up
 */
export async function checkExpiredReservations(expiryMinutes: number = 30) {
    try {
        const expiryTime = new Date(Date.now() - expiryMinutes * 60 * 1000);

        const pendingOrdersSnapshot = await adminDb.collection('orders')
            .where('status', '==', 'PENDING')
            .get();

        const expiredCount = pendingOrdersSnapshot.docs.filter(doc => {
            const data = doc.data();
            const createdAt = data.created_at?.toDate?.() || new Date(data.created_at);
            return createdAt < expiryTime;
        }).length;

        return {
            success: true,
            pendingTotal: pendingOrdersSnapshot.size,
            expiredCount,
            message: expiredCount > 0
                ? `${expiredCount} orders with expired reservations`
                : 'No expired reservations'
        };

    } catch (error) {
        console.error('[Stock Check] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Check failed'
        };
    }
}
