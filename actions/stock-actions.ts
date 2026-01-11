'use server';

import { loyverse } from '@/lib/loyverse';

export async function checkStock(sku: string | undefined, variantId: string | undefined) {
    if (!sku && !variantId) return { stock: 0, status: 'UNKNOWN' };

    try {
        // Fetch real inventory
        const inventoryData = await loyverse.getInventory();
        const inventoryMap = new Map<string, number>(); // VariantID -> Stock

        inventoryData.inventory_levels.forEach((inv: any) => {
            inventoryMap.set(inv.variant_id, inv.in_stock);
        });

        // 1. Try Variant ID first
        let targetVariantId = variantId;

        // 2. Fallback to SKU lookup if Variant ID is missing
        if (!targetVariantId && sku) {
            const itemsData = await loyverse.getItems();
            const itemsList = itemsData.items || [];

            for (const item of itemsList) {
                const found = item.variants.find((v: any) => v.sku === sku);
                if (found) {
                    targetVariantId = found.variant_id;
                    break;
                }
            }
        }

        if (!targetVariantId) {
            // If strictly enforced, this is OUT OF STOCK. 
            // But if we allow custom items not in Loyverse, we might say IN_STOCK?
            // User requested "Manual Entry" products. If I created a product with SKU "123" and Loyverse has no "123",
            // then Stock Check fails.
            // Let's assume Manual + SKU means "I expect it to be in Loyverse".
            return { stock: 0, status: 'NOT_FOUND' };
        }

        const currentStock = inventoryMap.get(targetVariantId) || 0;

        return {
            stock: currentStock,
            status: currentStock > 0 ? 'IN_STOCK' : 'OUT'
        };

    } catch (error) {
        console.error("Stock Check Action Error:", error);
        return { stock: 0, status: 'ERROR', error: 'Failed to check stock' };
    }
}
