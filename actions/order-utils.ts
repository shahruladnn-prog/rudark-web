'use server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createShipment } from './shipping-actions';
import { deductStock } from '@/actions/stock-validation';

export async function processSuccessfulOrder(orderId: string) {
    try {
        console.log(`[Order Processing] Starting for ${orderId}`);
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            console.error(`[Order Processing] Order ${orderId} not found`);
            throw new Error('Order not found');
        }

        const order = orderDoc.data();
        if (!order) return { success: false, error: 'No data' };

        const updates: any = {
            status: 'PAID',
            updated_at: new Date(),
            payment_method: 'CHIP'
        };

        // Increment promo usage if applicable
        if (order.promo_code) {
            try {
                const promoQuery = await adminDb.collection('promos')
                    .where('code', '==', order.promo_code)
                    .limit(1)
                    .get();
                if (!promoQuery.empty) {
                    await promoQuery.docs[0].ref.update({
                        usage_count: FieldValue.increment(1)
                    });
                }
            } catch (promoErr) {
                console.error(`[Order Processing] Failed to increment promo usage:`, promoErr);
            }
        }

        // 1. DEDUCT STOCK from Firebase (converts reserved → actual deduction)
        if (order.stock_deducted) {
            console.log('[Order Processing] Stock already deducted, skipping.');
        } else {
            console.log('[Order Processing] Deducting stock...');
            const stockResult = await deductStock(order.items);
            if (!stockResult.success) {
                console.error('[Order Processing] Stock deduction failed:', stockResult.error);
                updates.stock_deducted_error = stockResult.error;
            } else {
                console.log('[Order Processing] Stock deducted successfully');
                updates.stock_deducted = true;
            }
        }

        // 2. SHIPPING via ParcelAsia
        const shippingCost = Number(order.shipping_cost || 0);
        const deliveryMethod = order.delivery_method || 'delivery';

        if (deliveryMethod === 'self_collection') {
            console.log('[Order Processing] Self-collection — no shipment needed');
            updates.shipping_status = 'READY_FOR_COLLECTION';
            updates.tracking_no = 'N/A';
            updates.parcelasia_shipment_id = null;
        } else if (order.parcelasia_shipment_id) {
            console.log(`[Order Processing] ParcelAsia shipment already created (${order.parcelasia_shipment_id}), skipping.`);
        } else {
            try {
                console.log('[Order Processing] Creating ParcelAsia Shipment...');
                const provider = shippingCost === 0 ? 'jnt' : (order.shipping_provider || 'jnt');
                const shipmentResult = await createShipment({ id: orderId, ...order, shipping_provider: provider });

                if (shipmentResult.success) {
                    updates.parcelasia_shipment_id = shipmentResult.parcelasia_shipment_id;
                    updates.shipping_status = 'READY_TO_SHIP';

                    try {
                        const { checkoutShipment } = await import('@/actions/parcelasia-sync');
                        const checkoutResult = await checkoutShipment(shipmentResult.parcelasia_shipment_id!);
                        if (checkoutResult.success && checkoutResult.tracking_no) {
                            updates.tracking_no = checkoutResult.tracking_no;
                            updates.tracking_synced = true;
                            updates.tracking_synced_at = new Date();
                            updates.shipping_status = 'AWAITING_PICKUP';
                        } else {
                            updates.tracking_no = 'PENDING';
                            updates.tracking_synced = false;
                        }
                    } catch (checkoutError: any) {
                        console.warn(`[Order Processing] Auto-checkout failed: ${checkoutError.message}`);
                        updates.tracking_no = null;
                        updates.tracking_synced = false;
                    }
                } else {
                    console.error('[Order Processing] ParcelAsia Failed:', shipmentResult.error);
                    updates.shipping_error = shipmentResult.error;
                    updates.shipping_status = 'SHIPMENT_FAILED';
                }
            } catch (shipError) {
                console.error('[Order Processing] Shipping Sync Failed:', shipError);
                updates.shipping_status = 'SHIPMENT_FAILED';
            }
        }

        await orderRef.set(updates, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('[Order Processing] Error:', error);
        return { success: false, error: 'Processing failed' };
    }
}
