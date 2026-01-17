'use server';

import { adminDb } from '@/lib/firebase-admin';
import { verifyChipPayment } from './payment-processors/chip';
import { processSuccessfulOrder } from './order-utils';

export async function verifyOrderPayment(orderId: string) {
    try {
        console.log(`[VerifyOrder] Checking status for order: ${orderId}`);
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const data = orderDoc.data();

        // 1. If already paid, just return true
        if (data?.status === 'PAID' || data?.payment_status === 'paid') {
            console.log(`[VerifyOrder] Order ${orderId} is already PAID.`);
            return { success: true, status: 'PAID' };
        }

        // 2. If not paid, verify with CHIP
        const purchaseId = data?.chip_purchase_id;

        if (!purchaseId) {
            // Can't verify without purchase ID (unless other gateway.. assuming CHIP for now)
            return { success: false, error: 'No CHIP purchase ID found' };
        }

        const verifyResult = await verifyChipPayment(purchaseId);

        if (verifyResult.success && verifyResult.paid) {
            console.log(`[VerifyOrder] CHIP Confirmed Payment! Updating status...`);

            // Update Status
            await orderRef.update({
                status: 'PAID',
                payment_status: 'paid',
                chip_payment_data: {
                    purchase_id: purchaseId,
                    verified_at: new Date(),
                    verification_method: 'CLIENT_POLL'
                },
                updated_at: new Date()
            });

            // Trigger fulfillment
            const processResult = await processSuccessfulOrder(orderId);

            return {
                success: true,
                status: 'PAID',
                processed: processResult.success,
                message: 'Payment verified and processed'
            };
        }

        return { success: false, status: data?.status, message: 'Payment not yet confirmed by gateway' };

    } catch (error: any) {
        console.error('[VerifyOrder] Error:', error);
        return { success: false, error: error.message };
    }
}
