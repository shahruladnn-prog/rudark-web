'use server';
import { requireRole } from '@/actions/session-actions';
import { adminDb } from '@/lib/firebase-admin';

export async function checkStock(sku: string | undefined, variantId: string | undefined) {
    await requireRole(['owner', 'staff', 'warehouse']);

    if (!sku && !variantId) return { stock: 0, status: 'UNKNOWN' };

    try {
        // Try variant SKU lookup first
        const skuToSearch = sku || '';

        // Query by variant_skus array field (fast path)
        const variantSnap = await adminDb.collection('products')
            .where('variant_skus', 'array-contains', skuToSearch)
            .limit(1)
            .get();

        if (!variantSnap.empty) {
            const product = variantSnap.docs[0].data();
            const variant = (product.variants || []).find((v: any) => v.sku === skuToSearch);
            if (variant) {
                const stock = Math.max(0, (variant.stock_quantity || 0) - (variant.reserved_quantity || 0));
                return { stock, status: stock > 0 ? 'IN_STOCK' : 'OUT' };
            }
        }

        // Fallback: query by product SKU
        const productSnap = await adminDb.collection('products')
            .where('sku', '==', skuToSearch)
            .limit(1)
            .get();

        if (!productSnap.empty) {
            const product = productSnap.docs[0].data();
            const stock = Math.max(0, (product.stock_quantity || 0) - (product.reserved_quantity || 0));
            return { stock, status: stock > 0 ? 'IN_STOCK' : 'OUT' };
        }

        return { stock: 0, status: 'NOT_FOUND' };

    } catch (error) {
        console.error('[Stock Check] Error:', error);
        return { stock: 0, status: 'ERROR', error: 'Failed to check stock' };
    }
}
