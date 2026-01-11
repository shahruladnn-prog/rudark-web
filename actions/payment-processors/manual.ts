'use server';

import { adminDb } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { getPaymentSettings } from '@/actions/payment-settings-actions';

/**
 * Process manual payment (bank transfer, cash, etc.)
 */
export async function processManualPayment(orderId: string) {
    try {
        const settings = await getPaymentSettings();

        // Update order status to PENDING_PAYMENT
        await adminDb.collection('orders').doc(orderId).update({
            status: 'PENDING_PAYMENT',
            payment_method: 'manual',
            payment_gateway: 'manual',
            payment_instructions: settings.manual_payment.payment_instructions,
            requires_approval: settings.manual_payment.require_admin_approval,
            updated_at: new Date()
        });

        console.log('[Manual Payment] Order marked as pending payment:', orderId);

        // Redirect to manual payment instructions page
        redirect(`/checkout/manual-payment?order_id=${orderId}`);

    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error('[Manual Payment] Error:', error);
        return { error: 'Failed to process manual payment.' };
    }
}

/**
 * Approve manual payment (admin action)
 */
export async function approveManualPayment(orderId: string, adminUserId?: string) {
    try {
        const { processSuccessfulOrder } = await import('@/actions/order-utils');

        // Update order status
        await adminDb.collection('orders').doc(orderId).update({
            status: 'PAID',
            payment_approved_by: adminUserId || 'admin',
            payment_approved_at: new Date(),
            updated_at: new Date()
        });

        // Process order (stock deduction, Loyverse sync, etc.)
        await processSuccessfulOrder(orderId);

        return { success: true };
    } catch (error) {
        console.error('[Manual Payment] Approval error:', error);
        return { success: false, error: 'Failed to approve payment' };
    }
}

/**
 * Reject manual payment (admin action)
 */
export async function rejectManualPayment(orderId: string, reason: string, adminUserId?: string) {
    try {
        // Update order status to CANCELLED
        await adminDb.collection('orders').doc(orderId).update({
            status: 'CANCELLED',
            payment_rejection_reason: reason,
            payment_rejected_by: adminUserId || 'admin',
            payment_rejected_at: new Date(),
            updated_at: new Date()
        });

        // TODO: Release reserved stock if applicable

        return { success: true };
    } catch (error) {
        console.error('[Manual Payment] Rejection error:', error);
        return { success: false, error: 'Failed to reject payment' };
    }
}
