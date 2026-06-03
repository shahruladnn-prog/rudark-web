'use server';
import { requireRole } from '@/actions/session-actions';
import { adminDb } from '@/lib/firebase-admin';

export async function getAvailableStock(product: any): Promise<number> {
    await requireRole(['owner', 'staff', 'warehouse']);
    const total = product.stock_quantity || 0;
    const reserved = product.reserved_quantity || 0;
    return Math.max(0, total - reserved);
}

export async function initializeStockFields() {
    await requireRole(['owner', 'staff', 'warehouse']);

    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.get();
        const batch = adminDb.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const product = doc.data();
            if (product.stock_quantity === undefined || product.reserved_quantity === undefined) {
                batch.update(doc.ref, {
                    stock_quantity: product.stock_quantity || 0,
                    reserved_quantity: 0,
                    last_stock_sync: null
                });
                count++;
            }
        }

        if (count > 0) await batch.commit();
        return { success: true, initialized: count };
    } catch (error) {
        console.error('[Initialize Stock] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
