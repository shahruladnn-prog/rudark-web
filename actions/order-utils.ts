'use server';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { createShipment } from './shipping-actions';
// deductLoyverseStock removed - receipt creation auto-deducts Loyverse stock
import { deductStock } from '@/actions/stock-validation';
import { getDefaultStore } from '@/actions/store-actions';

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

        const updates: any = {
            status: 'PAID',
            updated_at: new Date(),
            payment_method: 'CHIP'
        };

        // 1. DEDUCT STOCK (converts reserved → actual deduction)
        // IDEMPOTENCY CHECK: Prevent double deduction
        if (order.stock_deducted) {
            console.log('[Order Processing] Stock already deducted, skipping.');
        } else {
            console.log('[Order Processing] Deducting stock...');
            const stockResult = await deductStock(order.items);

            if (!stockResult.success) {
                console.error('[Order Processing] Stock deduction failed:', stockResult.error);
                // Continue anyway - payment already succeeded, investigate later
                updates.stock_deducted_error = stockResult.error;
            } else {
                console.log('[Order Processing] Stock deducted successfully');
                updates.stock_deducted = true;
            }
        }

        // 2. Loyverse Integration (Inventory Deduction)
        try {
            // IDEMPOTENCY CHECK: Skip if already synced
            if (order.loyverse_status === 'SYNCED') {
                console.log('[ProcessOrder] Loyverse already synced, skipping.');
            } else {
                console.log(`[ProcessOrder] Syncing to Loyverse...`);

                // Map items for Loyverse Receipt with fallback for missing variant_id
                const receiptItems = await Promise.all((order.items || []).map(async (item: any) => {
                    const qty = Number(item.quantity);
                    const price = Number(item.web_price);

                    let variantId = item.loyverse_variant_id;

                    // Fallback: If variant_id is missing, fetch from Loyverse using SKU
                    // Try variant_sku first (for variant products), then fall back to sku
                    const skuToSearch = item.variant_sku || item.sku;

                    if (!variantId && skuToSearch) {
                        console.log(`[ProcessOrder] Missing variant_id for SKU "${skuToSearch}", fetching from Loyverse...`);
                        try {
                            const loyverseResponse = await loyverse.getItems();
                            const loyverseItems = loyverseResponse.items || [];

                            console.log(`[ProcessOrder] Searching ${loyverseItems.length} Loyverse items for SKU "${skuToSearch}"...`);

                            const matchingItem = loyverseItems.find((li: any) =>
                                li.variants?.some((v: any) => v.sku === skuToSearch)
                            );

                            if (matchingItem) {
                                const matchingVariant = matchingItem.variants.find((v: any) => v.sku === skuToSearch);
                                if (matchingVariant) {
                                    variantId = matchingVariant.variant_id;
                                    console.log(`[ProcessOrder] Found variant_id: ${variantId} for SKU "${skuToSearch}"`);

                                    // Update product in Firestore for future orders
                                    try {
                                        // Use the product_id if available, otherwise try sku
                                        const productDocId = item.product_id || item.sku;
                                        if (productDocId) {
                                            await adminDb.collection('products').doc(productDocId).update({
                                                loyverse_variant_id: variantId
                                            });
                                            console.log(`[ProcessOrder] Updated product ${productDocId} with variant_id`);
                                        }
                                    } catch (updateError) {
                                        console.warn(`[ProcessOrder] Could not update product with variant_id:`, updateError);
                                    }
                                }
                            } else {
                                // Log available SKUs for debugging
                                const availableSkus = loyverseItems.flatMap((li: any) =>
                                    li.variants?.map((v: any) => v.sku) || []
                                ).filter(Boolean).slice(0, 10);
                                console.warn(`[ProcessOrder] No Loyverse item found for SKU "${skuToSearch}". Sample available SKUs:`, availableSkus);
                            }
                        } catch (fetchError) {
                            console.error(`[ProcessOrder] Error fetching variant_id for SKU "${skuToSearch}":`, fetchError);
                        }
                    }

                    return {
                        variant_id: variantId,
                        quantity: qty,
                        price: price,
                        // DO NOT include 'name' or 'sku' when variant_id is provided
                        // Loyverse rejects receipts with both variant_id and name
                        _debug_sku: item.sku,  // For logging only, will be filtered out
                        _debug_name: item.name  // For logging only, will be filtered out
                    };
                }));

                // Filter for valid items only to prevent API rejection 
                const validLineItems: any[] = receiptItems
                    .filter((i: any) => i.variant_id)
                    .map((i: any) => ({
                        variant_id: i.variant_id,
                        quantity: i.quantity,
                        price: i.price
                        // Explicitly NOT including name, sku, or any other fields
                    }));

                // Log any items that still don't have variant_id
                const missingVariantIds = receiptItems.filter((i: any) => !i.variant_id);
                if (missingVariantIds.length > 0) {
                    console.warn(`[ProcessOrder] Items missing variant_id:`, missingVariantIds.map((i: any) => `${i._debug_sku} (${i._debug_name})`));
                }

                // Add Shipping/Collection Fee Line Item
                const shippingCost = Number(order.shipping_cost || 0);
                const collectionFee = Number(order.collection_fee || 0);
                const deliveryMethod = order.delivery_method || 'delivery';

                console.log(`[ProcessOrder] Delivery method: ${deliveryMethod}, Shipping: RM${shippingCost}, Collection: RM${collectionFee}`);

                if (deliveryMethod === 'self_collection' && collectionFee > 0) {
                    // Add collection fee for self-collection orders
                    const COLLECTION_FEE_VARIANT_ID = '405b8334-9248-432d-8458-5aefe0000af1'; // Same as shipping fee SKU 10071

                    validLineItems.push({
                        variant_id: COLLECTION_FEE_VARIANT_ID,
                        quantity: 1,
                        price: collectionFee,
                        line_note: `Collection Fee: RM${collectionFee.toFixed(2)}`
                    });

                    console.log(`[ProcessOrder] Added collection fee: RM${collectionFee}`);
                } else if (shippingCost > 0) {
                    // Add shipping fee for delivery orders
                    const SHIPPING_FEE_VARIANT_ID = '405b8334-9248-432d-8458-5aefe0000af1'; // SKU 10071

                    validLineItems.push({
                        variant_id: SHIPPING_FEE_VARIANT_ID,
                        quantity: 1,
                        price: shippingCost,
                        line_note: `Shipping: RM${shippingCost.toFixed(2)}`
                    });

                    console.log(`[ProcessOrder] Added shipping fee: RM${shippingCost}`);
                }

                if (validLineItems.length > 0) {
                    // Dynamic Store Lookup (replaces hardcoded UUIDs)
                    const defaultStore = await getDefaultStore();

                    // Fallback to hardcoded values if no store configured
                    const STORE_ID = defaultStore?.loyverse_store_id || '0a9b6f62-60b6-4de6-b3a8-164b96f402c1';
                    const PAYMENT_TYPE_ID = defaultStore?.loyverse_payment_type_id || 'e3f6b4a8-2c5d-4b89-bb7d-8d6819045065';

                    if (defaultStore) {
                        console.log(`[ProcessOrder] Using store: ${defaultStore.name} (${STORE_ID})`);
                    } else {
                        console.warn('[ProcessOrder] No default store configured, using hardcoded fallback');
                    }

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
                    // Clear any previous error on success
                    updates.loyverse_error = null;
                    console.log(`[ProcessOrder] Loyverse Synced (${validLineItems.length} items)`);

                    // NOTE: Loyverse receipt creation (line 162) auto-deducts stock
                    // Manual deduction removed to prevent double-deduction bug

                } else {
                    console.error('[ProcessOrder] Loyverse Failed: No valid items to sync');
                    updates.loyverse_status = 'FAILED_NO_VALID_ITEMS';
                }
            } // End Idempotency Else
        } catch (loyError: any) {
            const errorMessage = loyError?.message || String(loyError);
            console.error('[ProcessOrder] Loyverse Sync Failed:', errorMessage);
            console.error('[ProcessOrder] Loyverse Error Details:', loyError);
            updates.loyverse_status = 'FAILED';
            updates.loyverse_error = errorMessage.substring(0, 500); // Store first 500 chars
        }

        // 3. ParcelAsia Integration (Shipping)
        const shippingCost = Number(order.shipping_cost || 0);
        const deliveryMethod = order.delivery_method || 'delivery';

        if (deliveryMethod === 'self_collection') {
            console.log(`[ProcessOrder] Self-collection order - no shipment needed`);
            updates.shipping_status = 'READY_FOR_COLLECTION';
            updates.tracking_no = 'N/A';
            updates.parcelasia_shipment_id = null;
        } else {
            // IDEMPOTENCY CHECK: Skip if already has shipment ID
            if (order.parcelasia_shipment_id) {
                console.log(`[ProcessOrder] ParcelAsia shipment already created (${order.parcelasia_shipment_id}), skipping.`);
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
                        // Store ParcelAsia shipment ID
                        updates.parcelasia_shipment_id = shipmentResult.parcelasia_shipment_id;
                        updates.shipping_status = 'READY_TO_SHIP';
                        console.log(`[ProcessOrder] Added to ParcelAsia Cart. Shipment ID: ${shipmentResult.parcelasia_shipment_id}`);

                        // AUTO-CHECKOUT: Call ParcelAsia /checkout API to get tracking immediately
                        // This avoids the need for manual portal checkout
                        try {
                            const { checkoutShipment } = await import('@/actions/parcelasia-sync');
                            const checkoutResult = await checkoutShipment(shipmentResult.parcelasia_shipment_id!);

                            if (checkoutResult.success && checkoutResult.tracking_no) {
                                updates.tracking_no = checkoutResult.tracking_no;
                                updates.tracking_synced = true;
                                updates.tracking_synced_at = new Date();
                                updates.shipping_status = 'AWAITING_PICKUP';
                                console.log(`[ProcessOrder] Auto-checkout SUCCESS! Tracking: ${checkoutResult.tracking_no}`);
                            } else {
                                // Checkout may have succeeded but tracking not available yet
                                updates.tracking_no = 'PENDING';
                                updates.tracking_synced = false;
                                console.warn(`[ProcessOrder] Auto-checkout: ${checkoutResult.error || 'Tracking not immediately available'}`);
                            }
                        } catch (checkoutError: any) {
                            console.warn(`[ProcessOrder] Auto-checkout failed: ${checkoutError.message}. Manual sync required.`);
                            updates.tracking_no = null;
                            updates.tracking_synced = false;
                        }
                    } else {
                        console.error('[ProcessOrder] ParcelAsia Failed:', shipmentResult.error);
                        updates.shipping_error = shipmentResult.error;
                        updates.shipping_status = 'SHIPMENT_FAILED';
                    }
                } catch (shipError) {
                    console.error('[ProcessOrder] Shipping Sync Failed:', shipError);
                    updates.shipping_status = 'SHIPMENT_FAILED';
                }
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
