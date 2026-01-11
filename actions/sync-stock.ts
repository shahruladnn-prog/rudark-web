'use server';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Sync stock from Loyverse to Firebase
 * Run this hourly via Cloud Function or manually
 */
export async function syncStockFromLoyverse() {
    try {
        console.log('[Stock Sync] Starting...');

        // 1. Fetch items from Loyverse (to get SKU → variant_id mapping)
        const itemsData = await loyverse.getItems();
        const skuToVariantMap = new Map<string, string>();

        itemsData.items.forEach((item: any) => {
            item.variants.forEach((v: any) => {
                if (v.sku) {
                    skuToVariantMap.set(v.sku, v.variant_id);
                }
            });
        });

        console.log(`[Stock Sync] Built SKU map with ${skuToVariantMap.size} variants`);

        // 2. Fetch inventory from Loyverse
        const inventoryData = await loyverse.getInventory();
        const inventoryMap = new Map<string, number>();

        inventoryData.inventory_levels.forEach((inv: any) => {
            inventoryMap.set(inv.variant_id, inv.in_stock);
        });

        console.log(`[Stock Sync] Fetched ${inventoryMap.size} inventory items from Loyverse`);

        // 3. Update Firebase products
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.get();

        let updated = 0;
        let skipped = 0;

        const batch = adminDb.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const product = doc.data();

            // Try to get variant_id from product or from SKU mapping
            let variantId = product.loyverse_variant_id;

            if (!variantId && product.sku) {
                variantId = skuToVariantMap.get(product.sku);

                // If found, save it for future use
                if (variantId) {
                    batch.update(doc.ref, { loyverse_variant_id: variantId });
                }
            }

            if (!variantId) {
                console.log(`[Stock Sync] Skipping ${product.name} (${product.sku}) - no variant_id`);
                skipped++;
                continue;
            }

            const loyverseStock = inventoryMap.get(variantId);

            if (loyverseStock !== undefined) {
                // Update stock_quantity, keep reserved_quantity unchanged
                batch.update(doc.ref, {
                    stock_quantity: loyverseStock,
                    last_stock_sync: FieldValue.serverTimestamp()
                });
                updated++;
                batchCount++;

                console.log(`[Stock Sync] Updated ${product.name} (${product.sku}): ${loyverseStock} units`);

                // Firestore batch limit is 500 operations
                if (batchCount >= 500) {
                    await batch.commit();
                    batchCount = 0;
                }
            } else {
                console.log(`[Stock Sync] No inventory for ${product.name} (variant_id: ${variantId})`);
                skipped++;
            }
        }

        // Commit remaining
        if (batchCount > 0) {
            await batch.commit();
        }

        console.log(`[Stock Sync] Complete: ${updated} updated, ${skipped} skipped`);

        return {
            success: true,
            updated,
            skipped,
            total: snapshot.size,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('[Stock Sync] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get available stock (total - reserved)
 * This is a utility function, but must be async in server actions file
 */
export async function getAvailableStock(product: any): Promise<number> {
    const total = product.stock_quantity || 0;
    const reserved = product.reserved_quantity || 0;
    return Math.max(0, total - reserved);
}

/**
 * Initialize stock fields for products that don't have them
 */
export async function initializeStockFields() {
    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.get();

        const batch = adminDb.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const product = doc.data();

            // Only update if fields are missing
            if (product.stock_quantity === undefined || product.reserved_quantity === undefined) {
                batch.update(doc.ref, {
                    stock_quantity: product.stock_quantity || 0,
                    reserved_quantity: 0,
                    last_stock_sync: null
                });
                count++;
            }
        }

        if (count > 0) {
            await batch.commit();
        }

        return {
            success: true,
            initialized: count
        };

    } catch (error) {
        console.error('[Initialize Stock] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
