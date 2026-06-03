'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export interface StockMovement {
    id?: string;
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    type: 'RECEIVE' | 'ADJUST' | 'DAMAGE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SALE' | 'RETURN';
    quantity: number; // positive for add, negative for subtract
    previous_quantity: number;
    new_quantity: number;
    reason?: string;
    reference?: string; // PO number, document number, etc.
    channel?: 'website' | 'physical_store' | 'tiktok' | 'shopee' | 'event' | 'other';
    external_ref?: string; // Shopee order ID, TikTok order ID, receipt number, etc.
    store_id?: string;
    created_by?: string;
    created_at?: any;
    effective_date?: any; // For back-dated entries
}

/**
 * Record a stock movement and update product/variant stock
 */
export async function recordStockMovement(movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<{

 success: boolean; error?: string }> {
    await requireRole(['owner', 'staff', 'warehouse']);

    try {
        const result = await adminDb.runTransaction(async (transaction) => {
            // Get the product
            const productRef = adminDb.collection('products').doc(movement.product_id);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists) {
                throw new Error('Product not found');
            }

            const product = productDoc.data()!;
            let newQuantity: number;
            let previousQuantity: number;

            const reorderPoint = product.reorder_point ?? 5;
            const deriveStatus = (qty: number) =>
                qty === 0 ? 'OUT' : qty <= reorderPoint ? 'LOW' : 'IN_STOCK';

            // Check if updating variant or parent
            if (movement.variant_sku && product.variants && product.variants.length > 0) {
                // Update specific variant
                const variantIndex = product.variants.findIndex((v: any) => v.sku === movement.variant_sku);

                if (variantIndex === -1) {
                    throw new Error(`Variant ${movement.variant_sku} not found`);
                }

                previousQuantity = product.variants[variantIndex].stock_quantity || 0;
                newQuantity = previousQuantity + movement.quantity;

                if (newQuantity < 0) {
                    throw new Error(`Cannot reduce stock below 0. Current: ${previousQuantity}, Adjustment: ${movement.quantity}`);
                }

                // Update variant stock + status
                const updatedVariants = [...product.variants];
                updatedVariants[variantIndex] = {
                    ...updatedVariants[variantIndex],
                    stock_quantity: newQuantity,
                    stock_status: deriveStatus(newQuantity),
                };

                // Calculate new parent total and status
                const newParentTotal = updatedVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
                const allOut = updatedVariants.every((v: any) => v.stock_status === 'OUT' || v.stock_status === 'ARCHIVED');
                const anyIn = updatedVariants.some((v: any) => v.stock_status === 'IN_STOCK');
                const parentStatus = allOut ? 'OUT' : anyIn ? 'IN_STOCK' : 'LOW';

                transaction.update(productRef, {
                    variants: updatedVariants,
                    stock_quantity: newParentTotal,
                    stock_status: parentStatus,
                    updated_at: FieldValue.serverTimestamp()
                });

            } else {
                // Update parent product directly
                previousQuantity = product.stock_quantity || 0;
                newQuantity = previousQuantity + movement.quantity;

                if (newQuantity < 0) {
                    throw new Error(`Cannot reduce stock below 0. Current: ${previousQuantity}, Adjustment: ${movement.quantity}`);
                }

                transaction.update(productRef, {
                    stock_quantity: newQuantity,
                    stock_status: deriveStatus(newQuantity),
                    updated_at: FieldValue.serverTimestamp()
                });
            }

            // Record the movement
            const movementRef = adminDb.collection('stock_movements').doc();
            transaction.set(movementRef, {
                ...movement,
                previous_quantity: previousQuantity,
                new_quantity: newQuantity,
                created_at: FieldValue.serverTimestamp()
            });

            return { success: true };
        });

        revalidatePath('/admin/stock');
        return result;

    } catch (error: any) {
        console.error('[recordStockMovement] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get stock movement history
 */
export async function getStockMovements(limit = 50): Promise<StockMovement[]> {
    await requireRole(['owner', 'staff', 'warehouse']);

    try {
        const snapshot = await adminDb.collection('stock_movements')
            .orderBy('created_at', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.().toISOString() || null
        })) as StockMovement[];

    } catch (error) {
        console.error('[getStockMovements] Error:', error);
        return [];
    }
}

/**
 * Bulk stock adjustment — processes multiple product/variant rows in one call.
 * mode: 'delta'  → qty is added/subtracted from current stock (Receive / Damage)
 * mode: 'set'    → qty is the target absolute stock count
 */
export async function recordBulkStockMovements(
    rows: Array<{
        product_id: string;
        product_name: string;
        variant_sku?: string;
        variant_label?: string;
        qty: number;               // positive = add, negative = subtract (delta mode); or target (set mode)
        current_stock: number;     // current value, used for set-mode delta calculation
        mode: 'delta' | 'set';
        type: 'RECEIVE' | 'ADJUST' | 'DAMAGE';
    }>,
    reference?: string,
    reason?: string
): Promise<{ success: boolean; processed: number; errors: string[] }> {
    await requireRole(['owner', 'staff', 'warehouse']);

    const errors: string[] = [];
    let processed = 0;

    for (const row of rows) {
        const delta = row.mode === 'set' ? (row.qty - row.current_stock) : row.qty;
        if (delta === 0) continue; // skip no-change rows

        try {
            const result = await adminDb.runTransaction(async (transaction) => {
                const productRef = adminDb.collection('products').doc(row.product_id);
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists) throw new Error(`Product not found: ${row.product_name}`);

                const product = productDoc.data()!;
                let prevQty: number;
                let newQty: number;

                const rp = product.reorder_point ?? 5;
                const deriveStatus = (qty: number) =>
                    qty === 0 ? 'OUT' : qty <= rp ? 'LOW' : 'IN_STOCK';

                if (row.variant_sku && product.variants?.length > 0) {
                    const vi = product.variants.findIndex((v: any) => v.sku === row.variant_sku);
                    if (vi === -1) throw new Error(`Variant not found: ${row.variant_sku}`);
                    prevQty = product.variants[vi].stock_quantity || 0;
                    newQty = prevQty + delta;
                    if (newQty < 0) throw new Error(`Stock cannot go below 0 for ${row.variant_label || row.variant_sku}`);
                    const updatedVariants = [...product.variants];
                    updatedVariants[vi] = {
                        ...updatedVariants[vi],
                        stock_quantity: newQty,
                        stock_status: deriveStatus(newQty),
                    };
                    const parentTotal = updatedVariants.reduce((s: number, v: any) => s + (v.stock_quantity || 0), 0);
                    const allOut = updatedVariants.every((v: any) => v.stock_status === 'OUT' || v.stock_status === 'ARCHIVED');
                    const anyIn = updatedVariants.some((v: any) => v.stock_status === 'IN_STOCK');
                    const parentStatus = allOut ? 'OUT' : anyIn ? 'IN_STOCK' : 'LOW';
                    transaction.update(productRef, {
                        variants: updatedVariants,
                        stock_quantity: parentTotal,
                        stock_status: parentStatus,
                        updated_at: FieldValue.serverTimestamp()
                    });
                } else {
                    prevQty = product.stock_quantity || 0;
                    newQty = prevQty + delta;
                    if (newQty < 0) throw new Error(`Stock cannot go below 0 for ${row.product_name}`);
                    transaction.update(productRef, {
                        stock_quantity: newQty,
                        stock_status: deriveStatus(newQty),
                        updated_at: FieldValue.serverTimestamp()
                    });
                }

                const movRef = adminDb.collection('stock_movements').doc();
                transaction.set(movRef, {
                    product_id: row.product_id,
                    product_name: row.product_name,
                    variant_sku: row.variant_sku,
                    variant_label: row.variant_label,
                    type: row.type,
                    quantity: delta,
                    previous_quantity: prevQty,
                    new_quantity: newQty,
                    reason: reason || undefined,
                    reference: reference || undefined,
                    created_at: FieldValue.serverTimestamp(),
                });
            });

            processed++;
        } catch (err: any) {
            errors.push(err.message || `Error on ${row.variant_label || row.product_name}`);
        }
    }

    revalidatePath('/admin/stock');
    revalidatePath('/admin/stock/adjust');
    return { success: errors.length === 0, processed, errors };
}

/**
 * Record an external channel sale (physical store, TikTok, Shopee, event).
 * Deducts stock to a minimum of 0 (no negative stock).
 * Returns a warning if stock was insufficient.
 */
export async function recordExternalSale(params: {
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    quantity: number;
    channel: 'physical_store' | 'tiktok' | 'shopee' | 'event' | 'other';
    reference?: string;
}): Promise<{ success: boolean; warning?: string; error?: string }> {
    await requireRole(['owner', 'staff', 'warehouse']);

    try {
        const result = await adminDb.runTransaction(async (transaction) => {
            const productRef = adminDb.collection('products').doc(params.product_id);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists) throw new Error('Product not found');

            const product = productDoc.data()!;
            const rp = product.reorder_point ?? 5;
            const deriveStatus = (qty: number) =>
                qty === 0 ? 'OUT' : qty <= rp ? 'LOW' : 'IN_STOCK';

            let prevQty: number;
            let newQty: number;
            let warning: string | undefined;

            if (params.variant_sku && product.variants?.length > 0) {
                const vi = product.variants.findIndex((v: any) => v.sku === params.variant_sku);
                if (vi === -1) throw new Error(`Variant not found: ${params.variant_sku}`);
                prevQty = product.variants[vi].stock_quantity || 0;
                newQty = Math.max(0, prevQty - params.quantity);
                if (params.quantity > prevQty) {
                    warning = `Stock was ${prevQty} but sold ${params.quantity}. Set to 0.`;
                }
                const updatedVariants = [...product.variants];
                updatedVariants[vi] = {
                    ...updatedVariants[vi],
                    stock_quantity: newQty,
                    stock_status: deriveStatus(newQty),
                };
                const parentTotal = updatedVariants.reduce((s: number, v: any) => s + (v.stock_quantity || 0), 0);
                const allOut = updatedVariants.every((v: any) => v.stock_status === 'OUT' || v.stock_status === 'ARCHIVED');
                const anyIn = updatedVariants.some((v: any) => v.stock_status === 'IN_STOCK');
                transaction.update(productRef, {
                    variants: updatedVariants,
                    stock_quantity: parentTotal,
                    stock_status: allOut ? 'OUT' : anyIn ? 'IN_STOCK' : 'LOW',
                    updated_at: FieldValue.serverTimestamp()
                });
            } else {
                prevQty = product.stock_quantity || 0;
                newQty = Math.max(0, prevQty - params.quantity);
                if (params.quantity > prevQty) {
                    warning = `Stock was ${prevQty} but sold ${params.quantity}. Set to 0.`;
                }
                transaction.update(productRef, {
                    stock_quantity: newQty,
                    stock_status: deriveStatus(newQty),
                    updated_at: FieldValue.serverTimestamp()
                });
            }

            const movRef = adminDb.collection('stock_movements').doc();
            transaction.set(movRef, {
                product_id: params.product_id,
                product_name: params.product_name,
                variant_sku: params.variant_sku || null,
                variant_label: params.variant_label || null,
                type: 'SALE',
                quantity: -(params.quantity),
                previous_quantity: prevQty,
                new_quantity: newQty,
                channel: params.channel,
                reference: params.reference || null,
                reason: `${params.channel.replace('_', ' ')} sale`,
                created_at: FieldValue.serverTimestamp(),
            });

            return { warning };
        });

        revalidatePath('/admin/stock');
        return { success: true, warning: result.warning };
    } catch (error: any) {
        console.error('[recordExternalSale] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get products with variants for selection dropdown
 */
export async function getProductsForAdjustment() {
    await requireRole(['owner', 'staff', 'warehouse']);

    try {
        const snapshot = await adminDb.collection('products').orderBy('name', 'asc').get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'Unnamed',
                sku: data.sku || doc.id,
                stock_quantity: data.stock_quantity || 0,
                variants: (data.variants || []).map((v: any) => ({
                    sku: v.sku,
                    options: v.options || {},
                    stock_quantity: v.stock_quantity || 0,
                    label: Object.values(v.options || {}).join(' / ') || v.sku
                }))
            };
        });

    } catch (error) {
        console.error('[getProductsForAdjustment] Error:', error);
        return [];
    }
}
