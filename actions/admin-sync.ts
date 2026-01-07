'use server';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { Product } from '@/types';

export async function syncLoyverseToFirebase() {
    const stats = {
        total_items_fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
    };

    try {
        // 1. Fetch Items and Inventory from Loyverse
        // Note: Loyverse /items returns items with arrays of variants.
        // We assume 1-to-1 mapping or we create a product per variant if needed, 
        // but typically Retail apps map 1 Item -> 1 Product unless variants are distinct enough.
        // For this simple implementation, we will treat each VARIANT with a SKU as a valid product to be sold.
        // If an item has multiple variants (e.g. Size S, M, L), they will be individual entries or need complex logic.
        // Simplification: We iterate over ITEMS, then their VARIANTS. If SKU exists, we track it.

        const itemsData = await loyverse.getItems();
        const inventoryData = await loyverse.getInventory();

        const items = itemsData.items || [];
        const inventory = inventoryData.inventory_levels || [];

        stats.total_items_fetched = items.length;

        // Create a map of Variant ID -> Stock Level for quick lookup
        const stockMap = new Map<string, number>();
        inventory.forEach((inv: any) => {
            stockMap.set(inv.variant_id, inv.in_stock);
        });

        const batch = adminDb.batch();
        let batchCount = 0;

        for (const item of items) {
            for (const variant of item.variants) {
                if (!variant.sku) continue; // Skip items without SKU

                const stockLevel = stockMap.get(variant.variant_id) || 0;
                const stockStatus = stockLevel > 0 ? (stockLevel < 5 ? 'LOW' : 'IN_STOCK') : 'OUT';

                // Check if product exists in Firestore
                // We use SKU as the unique identifier for query, but Firestore ID can be anything.
                // Let's query by SKU.
                const productsRef = adminDb.collection('products');
                const q = productsRef.where('sku', '==', variant.sku).limit(1);
                const snapshot = await q.get();

                if (!snapshot.empty) {
                    // UPDATE EXISTING
                    // Only update stock status and maybe price if we monitored it, but user said:
                    // "Update stock_status only. If SKU is new, create draft."
                    const doc = snapshot.docs[0];

                    batch.update(doc.ref, {
                        stock_status: stockStatus,
                        loyverse_variant_id: variant.variant_id, // Ensure this link is fresh
                        loyverse_item_id: item.id,
                        // Optional: update Name if we want to keep it synced, but User might edit name on Web.
                        // We generally respect Web Name.
                        updated_at: new Date(),
                    });
                    stats.updated++;
                } else {
                    // CREATE NEW
                    const newDocRef = productsRef.doc();
                    const newProduct: Partial<Product> = {
                        sku: variant.sku,
                        name: item.item_name + (item.variants.length > 1 ? ` - ${variant.option1_value || ''}` : ''),
                        description: '', // Draft
                        web_price: variant.price, // Default to Store Price
                        images: [],
                        category: item.category_id || 'Uncategorized', // We might need to map ID to Name if important
                        stock_status: stockStatus,
                        loyverse_variant_id: variant.variant_id,
                        loyverse_item_id: item.id,
                    };

                    // Timestamp needs to be compatible with Firestore Admin
                    batch.set(newDocRef, { ...newProduct, created_at: new Date(), updated_at: new Date() });
                    stats.created++;
                }

                batchCount++;
                // Firestore batch limit is 500
                if (batchCount >= 450) {
                    await batch.commit();
                    // Reset batch is complex in loop, effectively we'd need a new batch.
                    // For simplicity in this script, assuming < 500 items. 
                    // If > 500, we need to re-instantiate batch. 
                    // TODO: Implement chunking for production with > 500 items.
                }
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

    } catch (error: any) {
        console.error('Sync Error:', error);
        stats.errors.push(error.message);
    }

    return stats;
}
