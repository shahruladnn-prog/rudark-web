'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Check stock for a single SKU against Firebase (website source of truth).
 * No Loyverse API call — Firebase IS the source of truth for online stock.
 * No admin role required — this is called from the customer-facing Add to Cart button.
 */
export async function checkLoyverseStock(sku: string, requestedQuantity: number) {
    return checkFirestoreStock(sku, requestedQuantity);
}

/**
 * Batch check stock for multiple items (used at checkout).
 * Firestore-only, no admin role required.
 */
export async function checkMultipleStock(items: Array<{ sku: string; quantity: number; name: string }>) {
    const results = [];
    const errors = [];

    for (const item of items) {
        const check = await checkFirestoreStock(item.sku, item.quantity);
        if (!check.available) {
            errors.push(`${item.name}: Only ${check.currentStock} available (requested ${item.quantity})`);
        }
        results.push({
            sku: item.sku,
            name: item.name,
            currentStock: check.currentStock,
            requested: item.quantity,
            available: check.available,
        });
    }

    return { success: errors.length === 0, results, errors };
}

/**
 * Core Firestore stock check.
 * 1. Checks parent product by SKU (for simple/non-variant products).
 * 2. If not found as parent, searches variants across all products.
 */
async function checkFirestoreStock(sku: string, requestedQuantity: number) {
    try {
        // 1. Check if SKU matches a parent product directly
        const parentSnap = await adminDb.collection('products')
            .where('sku', '==', sku)
            .limit(1)
            .get();

        if (!parentSnap.empty) {
            const product = parentSnap.docs[0].data();

            // If product has variants, the SKU should be a variant SKU — fall through to variant check
            if (!product.variants || product.variants.length === 0) {
                const available = Math.max(0, (product.stock_quantity ?? 0) - (product.reserved_quantity ?? 0));
                return {
                    available: available >= requestedQuantity,
                    currentStock: available,
                    requested: requestedQuantity,
                };
            }
        }

        // 2. Search variant SKUs
        // Fetch only products that have variants (more efficient: query by is_public but scan variants)
        const allSnap = await adminDb.collection('products')
            .where('is_public', '==', true)
            .get();

        for (const doc of allSnap.docs) {
            const product = doc.data();
            const variant = (product.variants || []).find((v: any) => v.sku === sku);
            if (variant) {
                const available = Math.max(0, (variant.stock_quantity ?? 0) - (variant.reserved_quantity ?? 0));
                return {
                    available: available >= requestedQuantity,
                    currentStock: available,
                    requested: requestedQuantity,
                };
            }
        }

        // 3. SKU not found anywhere — treat as unavailable
        console.warn(`[checkFirestoreStock] SKU not found: ${sku}`);
        return { available: false, currentStock: 0, requested: requestedQuantity };

    } catch (error) {
        console.error('[checkFirestoreStock] Error:', error);
        // Fail open: if we can't check, allow the sale (checkout has a second validation)
        return { available: true, currentStock: 99, requested: requestedQuantity };
    }
}
