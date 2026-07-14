'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { releaseReservedStock } from './stock-validation';
import { recordStockMovement } from './stock-movement-actions';
import { revalidatePath } from 'next/cache';
import { CartItem } from '@/types';

/**
 * Refund Item interface
 */
interface RefundItem {
    product_id: string;
    product_name: string;
    sku: string;
    variant_sku?: string;
    selected_options?: Record<string, string>;
    quantity: number;
    return_to_stock: boolean;
}

/**
 * Process a refund for an order
 * Optionally restores stock for returned items
 */
export async function processRefund(
    orderId: string,
    items: RefundItem[],
    reason: string,
    refundType: 'FULL' | 'PARTIAL' = 'FULL'
): Promise<{

 success: boolean; error?: string }> {
    await requireRole(['owner', 'staff']);

    try {
        // 1. Get the order
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data()!;

        // 2. Validate order status
        const refundableStatuses = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DEPOSIT_PAID', 'BALANCE_DUE'];
        if (!refundableStatuses.includes(order.status)) {
            return { success: false, error: `Cannot refund order with status: ${order.status}` };
        }

        console.log(`[Refund] Processing ${refundType} refund for order ${orderId}`);

        // 3. Process stock restoration for items that need it
        // Pre-order items were never deducted from stock (no reservation ever happened
        // for them), so "restoring" stock here would inflate phantom inventory.
        const stockRestorationItems: CartItem[] = [];

        for (const item of items) {
            if (item.return_to_stock && !order.is_pre_order) {
                // Build CartItem for stock restoration
                const cartItem: CartItem = {
                    id: item.product_id,
                    sku: item.sku,
                    name: item.product_name,
                    quantity: item.quantity,
                    selected_options: item.selected_options,
                    // These fields are required by CartItem but not used for stock
                    web_price: 0,
                    description: '',
                    images: [],
                    category_slug: '',
                    stock_status: 'IN_STOCK',
                    is_public: true,
                    is_home_public: false,
                    is_featured: false,
                    tags: [],
                    created_at: null,
                    updated_at: null
                };
                stockRestorationItems.push(cartItem);
            }
        }

        // 4. Restore stock (use similar logic to releaseReservedStock but add to stock_quantity)
        if (stockRestorationItems.length > 0) {
            await restoreStockForRefund(stockRestorationItems, orderId, reason);
            console.log(`[Refund] Restored stock for ${stockRestorationItems.length} items`);
        }

        // 5. Update order status
        const newStatus = refundType === 'FULL' ? 'REFUNDED' : 'PARTIAL_REFUND';

        await orderRef.update({
            status: newStatus,
            refund_data: {
                type: refundType,
                reason,
                items: items.map(i => ({
                    product_id: i.product_id,
                    product_name: i.product_name,
                    quantity: i.quantity,
                    returned_to_stock: i.return_to_stock
                })),
                refunded_at: new Date(),
                refunded_by: 'admin'
            },
            updated_at: new Date()
        });

        console.log(`[Refund] Order ${orderId} marked as ${newStatus}`);

        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${orderId}`);
        revalidatePath('/admin/stock');

        return { success: true };

    } catch (error) {
        console.error('[Refund] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Refund failed'
        };
    }
}

/**
 * Restore stock for refunded items
 * Similar to releaseReservedStock but adds to stock_quantity
 */
async function restoreStockForRefund(items: CartItem[], orderId: string, reason: string) {
    await adminDb.runTransaction(async (transaction) => {
        // Read all products first
        const productDocs = await Promise.all(
            items.map(item => {
                if (!item.id) return null;
                const productRef = adminDb.collection('products').doc(item.id);
                return transaction.get(productRef);
            })
        );

        // Then write
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const productDoc = productDocs[i];

            if (!productDoc || !productDoc.exists) continue;

            const product = productDoc.data();
            if (!product) continue;

            let previousQuantity = 0;
            let newQuantity = 0;

            // Check if this is a variant purchase
            const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
            const hasVariants = product.variants && product.variants.length > 0;

            if (hasVariantOptions && hasVariants) {
                // Find the matching variant
                const variantIndex = product.variants.findIndex((v: any) => {
                    if (!v.options) return false;
                    return Object.entries(item.selected_options!).every(
                        ([key, value]) => v.options[key] === value
                    );
                });

                if (variantIndex !== -1) {
                    previousQuantity = product.variants[variantIndex].stock_quantity || 0;
                    newQuantity = previousQuantity + item.quantity;

                    const updatedVariants = [...product.variants];
                    updatedVariants[variantIndex] = {
                        ...updatedVariants[variantIndex],
                        stock_quantity: newQuantity
                    };

                    // Update parent total (sum of all variants)
                    const newParentStock = updatedVariants.reduce(
                        (sum: number, v: any) => sum + (v.stock_quantity || 0), 0
                    );

                    transaction.update(productDoc.ref, {
                        variants: updatedVariants,
                        stock_quantity: newParentStock,
                        updated_at: new Date()
                    });
                }
            } else {
                // Parent-level restoration
                previousQuantity = product.stock_quantity || 0;
                newQuantity = previousQuantity + item.quantity;

                transaction.update(productDoc.ref, {
                    stock_quantity: newQuantity,
                    updated_at: new Date()
                });
            }

            // Record the movement inside the transaction
            const movementRef = adminDb.collection('stock_movements').doc();
            transaction.set(movementRef, {
                product_id: item.id,
                product_name: item.name,
                variant_sku: item.sku,
                type: 'RETURN',
                quantity: item.quantity,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                reason: `Refund: ${reason}`,
                reference: orderId,
                created_by: 'admin',
                created_at: FieldValue.serverTimestamp()
            });
        }
    });
}

/**
 * Get refundable items for an order
 */
export async function getRefundableItems(orderId: string) {
    await requireRole(['owner', 'staff']);

    try {
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found', items: [] };
        }

        const order = orderDoc.data()!;

        // Pre-orders only ever collect a fraction of the item's full price (a deposit,
        // or the full amount once the balance is also paid) — showing order.items' full
        // web_price/promo_price here would let an admin refund far more than was actually
        // charged via CHIP. Return a single lump-sum line representing what was actually
        // collected instead of an itemized breakdown at full price.
        if (order.is_pre_order) {
            const FULLY_PAID_STATUSES = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
            const amountCollected = FULLY_PAID_STATUSES.includes(order.status)
                ? Number(order.pre_order_full_total ?? order.subtotal ?? 0)
                : Number(order.deposit_amount ?? 0);

            const alreadyRefundedCount = order.refund_data?.items?.some((i: any) => i.product_id === 'PRE_ORDER_TOTAL') ? 1 : 0;
            const refundableQuantity = alreadyRefundedCount > 0 ? 0 : 1;

            if (refundableQuantity <= 0 || amountCollected <= 0) {
                return { success: true, items: [] };
            }

            return {
                success: true,
                items: [{
                    product_id: 'PRE_ORDER_TOTAL',
                    product_name: `Amount Collected — ${order.items?.[0]?.name || 'Pre-Order'}`,
                    sku: order.items?.[0]?.sku || '',
                    variant_sku: undefined,
                    selected_options: undefined,
                    original_quantity: 1,
                    already_refunded: alreadyRefundedCount,
                    refundable_quantity: refundableQuantity,
                    price: amountCollected,
                }],
            };
        }

        const items = order.items || [];

        // If there's already a refund, subtract those quantities
        const existingRefund = order.refund_data;
        const refundedQuantities: Record<string, number> = {};

        if (existingRefund?.items) {
            for (const refundedItem of existingRefund.items) {
                const key = `${refundedItem.product_id}-${JSON.stringify(refundedItem.selected_options || {})}`;
                refundedQuantities[key] = (refundedQuantities[key] || 0) + refundedItem.quantity;
            }
        }

        const refundableItems = items.map((item: any) => {
            const key = `${item.id}-${JSON.stringify(item.selected_options || {})}`;
            const alreadyRefunded = refundedQuantities[key] || 0;
            const refundable = Math.max(0, item.quantity - alreadyRefunded);

            return {
                product_id: item.id,
                product_name: item.name,
                sku: item.sku,
                variant_sku: item.variant_sku,
                selected_options: item.selected_options,
                original_quantity: item.quantity,
                already_refunded: alreadyRefunded,
                refundable_quantity: refundable,
                price: item.promo_price || item.web_price
            };
        }).filter((item: any) => item.refundable_quantity > 0);

        return { success: true, items: refundableItems };

    } catch (error) {
        console.error('[Refund] Error getting refundable items:', error);
        return { success: false, error: 'Failed to get refundable items', items: [] };
    }
}
