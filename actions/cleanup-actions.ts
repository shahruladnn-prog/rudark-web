'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Delete all orders from Firebase
 * WARNING: This is destructive and irreversible!
 */
export async function deleteAllOrders(): Promise<{
    success: boolean;
    deleted: number;
    error?: string;
}> {
    try {
        console.log('[Cleanup] Starting deletion of all orders...');

        const ordersRef = adminDb.collection('orders');
        const snapshot = await ordersRef.get();

        if (snapshot.empty) {
            console.log('[Cleanup] No orders to delete');
            return { success: true, deleted: 0 };
        }

        const batchSize = 500; // Firestore batch limit
        let totalDeleted = 0;

        // Process in batches
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = adminDb.batch();
            const chunk = docs.slice(i, i + batchSize);

            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            totalDeleted += chunk.length;
            console.log(`[Cleanup] Deleted batch: ${totalDeleted}/${docs.length}`);
        }

        console.log(`[Cleanup] Successfully deleted ${totalDeleted} orders`);
        return { success: true, deleted: totalDeleted };

    } catch (error: any) {
        console.error('[Cleanup] Error deleting orders:', error);
        return {
            success: false,
            deleted: 0,
            error: error?.message || String(error)
        };
    }
}

/**
 * Reset stock levels - clears reserved quantities
 * Call this after deleting orders to reset reservation counts
 */
export async function resetReservedStock(): Promise<{
    success: boolean;
    updated: number;
    error?: string;
}> {
    try {
        console.log('[Cleanup] Resetting reserved stock quantities...');

        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.get();

        if (snapshot.empty) {
            return { success: true, updated: 0 };
        }

        let updated = 0;
        const batch = adminDb.batch();

        snapshot.docs.forEach(doc => {
            const product = doc.data();

            // Reset parent reserved quantity
            const updates: any = {
                reserved_quantity: 0,
                updated_at: new Date()
            };

            // Also reset variant reserved quantities if they exist
            if (product.variants && Array.isArray(product.variants)) {
                updates.variants = product.variants.map((v: any) => ({
                    ...v,
                    reserved_quantity: 0
                }));
            }

            batch.update(doc.ref, updates);
            updated++;
        });

        await batch.commit();
        console.log(`[Cleanup] Reset reserved stock for ${updated} products`);

        return { success: true, updated };

    } catch (error: any) {
        console.error('[Cleanup] Error resetting stock:', error);
        return {
            success: false,
            updated: 0,
            error: error?.message || String(error)
        };
    }
}
