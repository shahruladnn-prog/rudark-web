'use server';

import { processSuccessfulOrder } from '@/actions/order-utils';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Re-process a failed order's Loyverse sync
 * Use this when an order failed to sync to Loyverse and you want to retry
 */
export async function reprocessLoyverseSync(orderId: string): Promise<{
    success: boolean;
    message: string;
    loyverse_status?: string;
    loyverse_error?: string;
}> {
    try {
        if (!orderId) {
            return { success: false, message: 'Order ID is required' };
        }

        // Get the order
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
            return { success: false, message: 'Order not found' };
        }

        const orderData = orderDoc.data();

        // Check if order is PAID
        if (orderData?.status !== 'PAID') {
            return {
                success: false,
                message: `Order status is ${orderData?.status}, expected PAID`
            };
        }

        // Check if already synced
        if (orderData?.loyverse_status === 'SYNCED') {
            return {
                success: false,
                message: 'Order already synced to Loyverse'
            };
        }

        console.log(`[Reprocess] Attempting to re-sync order ${orderId} to Loyverse...`);

        // Reset loyverse status to force re-sync
        await adminDb.collection('orders').doc(orderId).update({
            loyverse_status: 'PENDING',
            loyverse_error: null
        });

        // Re-process the order (this will call Loyverse again)
        await processSuccessfulOrder(orderId);

        // Check the result
        const updatedDoc = await adminDb.collection('orders').doc(orderId).get();
        const updatedData = updatedDoc.data();

        return {
            success: updatedData?.loyverse_status === 'SYNCED' || updatedData?.loyverse_status === 'PARTIAL_SYNC',
            message: updatedData?.loyverse_status === 'SYNCED'
                ? 'Successfully synced to Loyverse'
                : updatedData?.loyverse_status === 'PARTIAL_SYNC'
                    ? 'Partially synced to Loyverse (some items missing)'
                    : `Sync failed: ${updatedData?.loyverse_error || 'Unknown error'}`,
            loyverse_status: updatedData?.loyverse_status,
            loyverse_error: updatedData?.loyverse_error
        };

    } catch (error: any) {
        console.error('[Reprocess] Error:', error);
        return {
            success: false,
            message: `Error: ${error?.message || String(error)}`
        };
    }
}
