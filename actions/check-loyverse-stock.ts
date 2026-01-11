'use server';

import { loyverse } from '@/lib/loyverse';

/**
 * Check real-time stock from Loyverse API
 * Called when user clicks "Add to Cart" or "Calculate Shipping"
 */
export async function checkLoyverseStock(sku: string, requestedQuantity: number) {
    try {
        // 1. Get items to find variant_id by SKU
        const itemsData = await loyverse.getItems();
        let variantId: string | null = null;

        for (const item of itemsData.items) {
            for (const variant of item.variants) {
                if (variant.sku === sku) {
                    variantId = variant.variant_id;
                    break;
                }
            }
            if (variantId) break;
        }

        if (!variantId) {
            return {
                available: false,
                error: 'Product not found in inventory system',
                currentStock: 0
            };
        }

        // 2. Get current stock level
        const inventoryData = await loyverse.getInventory();
        const stockItem = inventoryData.inventory_levels.find(
            (inv: any) => inv.variant_id === variantId
        );

        const currentStock = stockItem?.in_stock || 0;

        // 3. Check if requested quantity is available
        if (currentStock < requestedQuantity) {
            return {
                available: false,
                error: `Only ${currentStock} units available`,
                currentStock,
                requested: requestedQuantity
            };
        }

        return {
            available: true,
            currentStock,
            requested: requestedQuantity
        };

    } catch (error) {
        console.error('[Loyverse Stock Check] Error:', error);
        return {
            available: false,
            error: 'Unable to check stock availability',
            currentStock: 0
        };
    }
}

/**
 * Batch check stock for multiple items (for cart/checkout)
 */
export async function checkMultipleStock(items: Array<{ sku: string; quantity: number; name: string }>) {
    try {
        // 1. Build SKU → variant_id map
        const itemsData = await loyverse.getItems();
        const skuToVariantMap = new Map<string, string>();

        itemsData.items.forEach((item: any) => {
            item.variants.forEach((v: any) => {
                if (v.sku) {
                    skuToVariantMap.set(v.sku, v.variant_id);
                }
            });
        });

        // 2. Get all inventory levels
        const inventoryData = await loyverse.getInventory();
        const inventoryMap = new Map<string, number>();

        inventoryData.inventory_levels.forEach((inv: any) => {
            inventoryMap.set(inv.variant_id, inv.in_stock);
        });

        // 3. Check each item
        const results = [];
        const errors = [];

        for (const item of items) {
            const variantId = skuToVariantMap.get(item.sku);

            if (!variantId) {
                errors.push(`${item.name}: Not found in inventory`);
                continue;
            }

            const currentStock = inventoryMap.get(variantId) || 0;

            if (currentStock < item.quantity) {
                errors.push(`${item.name}: Only ${currentStock} available (requested ${item.quantity})`);
            }

            results.push({
                sku: item.sku,
                name: item.name,
                currentStock,
                requested: item.quantity,
                available: currentStock >= item.quantity
            });
        }

        return {
            success: errors.length === 0,
            results,
            errors
        };

    } catch (error) {
        console.error('[Batch Stock Check] Error:', error);
        return {
            success: false,
            results: [],
            errors: ['Unable to check stock availability']
        };
    }
}
