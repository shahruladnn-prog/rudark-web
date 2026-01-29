'use server';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';

/**
 * Sync stock from Loyverse to Firebase
 * This fetches current inventory levels from Loyverse and updates Firebase products
 * 
 * Use this when Loyverse is the source of truth and you want to reset Firebase stock
 */
export async function syncStockFromLoyverse(): Promise<{
    success: boolean;
    synced: number;
    skipped: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let synced = 0;
    let skipped = 0;

    try {
        console.log('[StockSync] Fetching inventory from Loyverse...');

        // Get all items from Loyverse
        const { items: loyverseItems } = await loyverse.getItems();
        console.log(`[StockSync] Found ${loyverseItems.length} items in Loyverse`);

        // Get all inventory levels from Loyverse
        const { inventory_levels } = await loyverse.getInventory();
        console.log(`[StockSync] Found ${inventory_levels.length} inventory records`);

        // Create a map of variant_id -> stock_quantity
        const inventoryMap = new Map<string, number>();
        inventory_levels.forEach((inv: any) => {
            // Sum up stock across all stores for this variant
            const current = inventoryMap.get(inv.variant_id) || 0;
            inventoryMap.set(inv.variant_id, current + (inv.in_stock || 0));
        });

        // Create a map of SKU -> variant info
        const skuToVariant = new Map<string, { variant_id: string; stock: number }>();
        loyverseItems.forEach((item: any) => {
            if (item.variants) {
                item.variants.forEach((v: any) => {
                    if (v.sku) {
                        const stock = inventoryMap.get(v.id) || 0;
                        skuToVariant.set(v.sku.toUpperCase(), {
                            variant_id: v.id,
                            stock
                        });
                    }
                });
            }
        });

        console.log(`[StockSync] Mapped ${skuToVariant.size} SKUs with inventory`);

        // Get all Firebase products
        const productsSnapshot = await adminDb.collection('products').get();
        console.log(`[StockSync] Found ${productsSnapshot.size} products in Firebase`);

        // Update each product
        for (const doc of productsSnapshot.docs) {
            try {
                const product = doc.data();
                const updates: any = {
                    updated_at: new Date(),
                    reserved_quantity: 0  // Reset reservations
                };

                let productUpdated = false;

                // Update variant stock levels
                if (product.variants && Array.isArray(product.variants)) {
                    let totalStock = 0;

                    updates.variants = product.variants.map((variant: any) => {
                        const sku = (variant.sku || '').toUpperCase();
                        const loyverseData = skuToVariant.get(sku);

                        if (loyverseData) {
                            totalStock += loyverseData.stock;
                            productUpdated = true;
                            return {
                                ...variant,
                                stock_quantity: loyverseData.stock,
                                reserved_quantity: 0,
                                loyverse_variant_id: loyverseData.variant_id
                            };
                        }

                        // No Loyverse match - keep existing stock and variant_id
                        totalStock += variant.stock_quantity || 0;
                        const cleanVariant: any = {
                            ...variant,
                            reserved_quantity: 0
                        };
                        // Remove undefined loyverse_variant_id to avoid Firestore error
                        if (cleanVariant.loyverse_variant_id === undefined) {
                            delete cleanVariant.loyverse_variant_id;
                        }
                        return cleanVariant;
                    });

                    updates.stock_quantity = totalStock;
                } else {
                    // Non-variant product
                    const sku = (product.sku || '').toUpperCase();
                    const loyverseData = skuToVariant.get(sku);

                    if (loyverseData) {
                        updates.stock_quantity = loyverseData.stock;
                        updates.loyverse_variant_id = loyverseData.variant_id;
                        productUpdated = true;
                    }
                }

                await adminDb.collection('products').doc(doc.id).update(updates);

                if (productUpdated) {
                    synced++;
                    console.log(`[StockSync] Updated ${product.name} (${product.sku})`);
                } else {
                    skipped++;
                }

            } catch (prodError: any) {
                const errMsg = `Failed to update ${doc.id}: ${prodError?.message}`;
                errors.push(errMsg);
                console.error(`[StockSync] ${errMsg}`);
            }
        }

        console.log(`[StockSync] Complete: ${synced} synced, ${skipped} skipped, ${errors.length} errors`);

        return {
            success: errors.length === 0,
            synced,
            skipped,
            errors
        };

    } catch (error: any) {
        console.error('[StockSync] Fatal error:', error);
        return {
            success: false,
            synced,
            skipped,
            errors: [...errors, error?.message || String(error)]
        };
    }
}
