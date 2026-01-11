'use server';

import { loyverse } from '@/lib/loyverse';

/**
 * Deduct stock from Loyverse after successful order
 * Called from order-utils.ts after payment confirmation
 */
export async function deductLoyverseStock(orderItems: Array<{
    sku: string;
    quantity: number;
    name: string;
}>) {
    try {
        console.log('[Stock Deduction] Starting for', orderItems.length, 'items');

        // 1. Get SKU → variant_id mapping from Loyverse
        const itemsData = await loyverse.getItems();
        const skuToVariantMap = new Map<string, string>();

        itemsData.items.forEach((item: any) => {
            item.variants.forEach((v: any) => {
                if (v.sku) {
                    skuToVariantMap.set(v.sku, v.variant_id);
                }
            });
        });

        console.log(`[Stock Deduction] Built SKU map with ${skuToVariantMap.size} variants`);

        // 2. Deduct stock for each item
        const results = [];

        for (const orderItem of orderItems) {
            const variantId = skuToVariantMap.get(orderItem.sku);

            if (!variantId) {
                console.error(`[Stock Deduction] No variant_id for SKU: ${orderItem.sku}`);
                results.push({
                    sku: orderItem.sku,
                    name: orderItem.name,
                    success: false,
                    error: 'Variant not found in Loyverse'
                });
                continue;
            }

            try {
                // Call Loyverse Inventory Adjustment API
                await loyverse.adjustInventory({
                    variant_id: variantId,
                    adjustment: -orderItem.quantity,
                    reason: 'Web Order Sale'
                });

                console.log(`[Stock Deduction] ✓ ${orderItem.name} (${orderItem.sku}): -${orderItem.quantity} units`);

                results.push({
                    sku: orderItem.sku,
                    name: orderItem.name,
                    success: true,
                    deducted: orderItem.quantity
                });

            } catch (error: any) {
                console.error(`[Stock Deduction] Failed for ${orderItem.sku}:`, error);
                results.push({
                    sku: orderItem.sku,
                    name: orderItem.name,
                    success: false,
                    error: error.message || String(error)
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failedItems = results.filter(r => !r.success);

        console.log(`[Stock Deduction] Complete: ${successCount}/${orderItems.length} succeeded`);

        if (failedItems.length > 0) {
            console.error('[Stock Deduction] Failed items:', failedItems);
        }

        return {
            success: successCount === orderItems.length,
            results,
            summary: `${successCount}/${orderItems.length} items deducted`,
            failedItems: failedItems.length > 0 ? failedItems : undefined
        };

    } catch (error: any) {
        console.error('[Stock Deduction] Fatal error:', error);
        return {
            success: false,
            error: error.message || String(error),
            summary: 'Stock deduction failed'
        };
    }
}
