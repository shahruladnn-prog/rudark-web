'use server';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { createShipment } from './shipping-actions';
import { deductLoyverseStock } from './deduct-loyverse-stock';
import { deductStock } from '@/actions/stock-validation';

/**
 * Process order after successful payment
 * 1. Deduct stock from Firebase
 * 2. Sync to Loyverse
 * 3. Update order status
 */
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
        if (!order) return { success: false, error: "No data" };

        // 1. DEDUCT STOCK (converts reserved → actual deduction)
        const stockResult = await deductStock(order.items);
        if (!stockResult.success) {
            console.error('[Order Processing] Stock deduction failed:', stockResult.error);
            // Continue anyway - payment already succeeded
        } else {
            console.log('[Order Processing] Stock deducted successfully');
        }

        const updates: any = {
            status: 'PAID',
            updated_at: new Date(),
            payment_method: 'BizApp'
        };

        // 2. Loyverse Integration (Inventory Deduction)
        try {
            console.log(`[ProcessOrder] Syncing to Loyverse...`);
            // Map items for Loyverse Receipt
            const receiptItems = (order.items || []).map((item: any) => {
                const qty = Number(item.quantity);
                const price = Number(item.web_price);
                return {
                    variant_id: item.loyverse_variant_id,
                    quantity: qty,
                    price: price  // Loyverse uses simple 'price' field, not 'price_money'
                };
            });

            // Filter for valid items only to prevent API rejection 
            const validLineItems = receiptItems.filter((i: any) => i.variant_id);

            // Add Shipping Fee Line Item
            const shippingCost = Number(order.shipping_cost || 0);
            console.log(`[ProcessOrder] Raw shipping_cost from order: ${order.shipping_cost}, Parsed: ${shippingCost}`);

            if (shippingCost > 0) {
                const SHIPPING_FEE_VARIANT_ID = '405b8334-9248-432d-8458-5aefe0000af1'; // SKU 10071

                // Loyverse API uses simple 'price' field, not 'price_money' object
                validLineItems.push({
                    variant_id: SHIPPING_FEE_VARIANT_ID,
                    quantity: 1,
                    price: shippingCost,
                    line_note: `Shipping: RM${shippingCost.toFixed(2)}`
                });

                console.log(`[ProcessOrder] Added shipping fee: RM${shippingCost}`);
            }

            if (validLineItems.length > 0) {
                // UUIDs provided by User
                const STORE_ID = '0a9b6f62-60b6-4de6-b3a8-164b96f402c1';
                const PAYMENT_TYPE_ID = 'e3f6b4a8-2c5d-4b89-bb7d-8d6819045065';

                const totalAmount = Number(order.total_amount);

                const receiptPayload = {
                    receipt_number: `R-${orderId}`,
                    note: `Web Order ${orderId}`,
                    order_id: orderId,
                    line_items: validLineItems,
                    total_money: { amount: totalAmount, currency: 'MYR' },
                    store_id: STORE_ID,
                    payments: [{
                        payment_type_id: PAYMENT_TYPE_ID,
                        amount_money: { amount: totalAmount, currency: 'MYR' }
                    }]
                };

                console.log('[ProcessOrder] Receipt Payload:', JSON.stringify(receiptPayload, null, 2));

                await loyverse.createReceipt(receiptPayload);

                // Check if we lost any items
                if (validLineItems.length !== receiptItems.length) {
                    console.warn(`[ProcessOrder] Loyverse Partial Sync: ${receiptItems.length - validLineItems.length} items missing variant_id`);
                    updates.loyverse_status = 'PARTIAL_SYNC';
                    updates.loyverse_warning = 'Some items missing variant_id';
                } else {
                    updates.loyverse_status = 'SYNCED';
                }
                console.log(`[ProcessOrder] Loyverse Synced (${validLineItems.length} items)`);

                // ✅ NEW: Deduct stock from Loyverse inventory
                try {
                    console.log('[ProcessOrder] Deducting Loyverse stock...');

                    const orderItems = (order.items || []).map((item: any) => ({
                        sku: item.sku,
                        quantity: Number(item.quantity),
                        name: item.name
                    }));

                    const deductionResult = await deductLoyverseStock(orderItems);

                    if (deductionResult.success) {
                        updates.stock_deducted = true;
                        updates.stock_deduction_summary = deductionResult.summary;
                        console.log(`[ProcessOrder] ✓ Stock deducted: ${deductionResult.summary}`);
                    } else {
                        updates.stock_deducted = false;
                        updates.stock_deduction_error = deductionResult.error || 'Partial failure';
                        if (deductionResult.failedItems) {
                            updates.stock_deduction_details = deductionResult.failedItems;
                        }
                        console.error('[ProcessOrder] ✗ Stock deduction failed:', deductionResult);
                    }

                } catch (stockError: any) {
                    console.error('[ProcessOrder] Stock deduction error:', stockError);
                    updates.stock_deducted = false;
                    updates.stock_deduction_error = stockError.message || String(stockError);
                }

            } else {
                console.error('[ProcessOrder] Loyverse Failed: No valid items to sync');
                updates.loyverse_status = 'FAILED_NO_VALID_ITEMS';
            }
        } catch (loyError) {
            console.error('[ProcessOrder] Loyverse Sync Failed:', loyError);
            updates.loyverse_status = 'FAILED';
        }

        // 3. ParcelAsia Integration (Shipping)
        const shippingCost = Number(order.shipping_cost || 0);
        const deliveryMethod = order.delivery_method || 'delivery';

        if (deliveryMethod === 'self_collection') {
            console.log(`[ProcessOrder] Self-collection order - no shipment needed`);
            updates.shipping_status = 'READY_FOR_COLLECTION';
            updates.tracking_no = 'N/A';
        } else {
            // Always create shipment for delivery orders (even if free shipping)
            try {
                console.log(`[ProcessOrder] Creating ParcelAsia Shipment...`);

                // Force J&T for free shipping orders
                const provider = shippingCost === 0 ? 'jnt' : (order.shipping_provider || 'jnt');

                const shipmentResult = await createShipment({
                    id: orderId,
                    ...order,
                    shipping_provider: provider
                });

                if (shipmentResult.success) {
                    updates.tracking_no = shipmentResult.tracking_no;
                    updates.shipment_id = shipmentResult.shipment_id;
                    updates.shipping_status = 'READY_TO_SHIP';
                    console.log(`[ProcessOrder] Shipment Created: ${shipmentResult.tracking_no}`);
                } else {
                    console.error('[ProcessOrder] ParcelAsia Failed:', shipmentResult.error);
                    updates.shipping_error = shipmentResult.error;
                }
            } catch (shipError) {
                console.error('[ProcessOrder] Shipping Sync Failed:', shipError);
            }
        }

        // Final Update
        await orderRef.set(updates, { merge: true });

        return { success: true };
    } catch (error) {
        console.error(`[ProcessOrder] Error:`, error);
        return { success: false, error: "Processing failed" };
    }
}
