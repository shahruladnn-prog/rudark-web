'use server';

import { adminDb } from '@/lib/firebase-admin';
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
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Get the order
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found' };
        }

        const order = orderDoc.data()!;

        // 2. Validate order status
        const refundableStatuses = ['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
        if (!refundableStatuses.includes(order.status)) {
            return { success: false, error: `Cannot refund order with status: ${order.status}` };
        }

        console.log(`[Refund] Processing ${refundType} refund for order ${orderId}`);

        // 3. Process stock restoration for items that need it
        const stockRestorationItems: CartItem[] = [];

        for (const item of items) {
            if (item.return_to_stock) {
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
                    is_featured: false,
                    tags: [],
                    created_at: null,
                    updated_at: null
                };
                stockRestorationItems.push(cartItem);

                // Record stock movement
                // Note: We pass 0 for previous/new quantity as actual values are calculated in recordStockMovement
                await recordStockMovement({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_sku: item.variant_sku,
                    type: 'RETURN',
                    quantity: item.quantity, // Positive = adding back
                    previous_quantity: 0, // Will be updated by the function
                    new_quantity: 0, // Will be updated by the function
                    reason: `Refund: ${reason}`,
                    reference: orderId,
                    created_by: 'admin'
                });
            }
        }

        // 4. Restore stock (use similar logic to releaseReservedStock but add to stock_quantity)
        if (stockRestorationItems.length > 0) {
            await restoreStockForRefund(stockRestorationItems);
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
async function restoreStockForRefund(items: CartItem[]) {
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
                    const updatedVariants = [...product.variants];
                    updatedVariants[variantIndex] = {
                        ...updatedVariants[variantIndex],
                        stock_quantity: (updatedVariants[variantIndex].stock_quantity || 0) + item.quantity
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
                transaction.update(productDoc.ref, {
                    stock_quantity: (product.stock_quantity || 0) + item.quantity,
                    updated_at: new Date()
                });
            }
        }
    });
}

/**
 * Get refundable items for an order
 */
export async function getRefundableItems(orderId: string) {
    try {
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
            return { success: false, error: 'Order not found', items: [] };
        }

        const order = orderDoc.data()!;
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
