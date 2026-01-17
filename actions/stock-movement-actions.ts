'use server';

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
    store_id?: string;
    created_by?: string;
    created_at?: any;
}

/**
 * Record a stock movement and update product/variant stock
 */
export async function recordStockMovement(movement: Omit<StockMovement, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the product
        const productRef = adminDb.collection('products').doc(movement.product_id);
        const productDoc = await productRef.get();

        if (!productDoc.exists) {
            return { success: false, error: 'Product not found' };
        }

        const product = productDoc.data()!;
        let newQuantity: number;
        let previousQuantity: number;

        // Check if updating variant or parent
        if (movement.variant_sku && product.variants && product.variants.length > 0) {
            // Update specific variant
            const variantIndex = product.variants.findIndex((v: any) => v.sku === movement.variant_sku);

            if (variantIndex === -1) {
                return { success: false, error: `Variant ${movement.variant_sku} not found` };
            }

            previousQuantity = product.variants[variantIndex].stock_quantity || 0;
            newQuantity = previousQuantity + movement.quantity;

            if (newQuantity < 0) {
                return { success: false, error: `Cannot reduce stock below 0. Current: ${previousQuantity}, Adjustment: ${movement.quantity}` };
            }

            // Update variant in array
            const updatedVariants = [...product.variants];
            updatedVariants[variantIndex] = {
                ...updatedVariants[variantIndex],
                stock_quantity: newQuantity
            };

            // Calculate new parent total
            const newParentTotal = updatedVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);

            await productRef.update({
                variants: updatedVariants,
                stock_quantity: newParentTotal,
                updated_at: FieldValue.serverTimestamp()
            });

        } else {
            // Update parent product directly
            previousQuantity = product.stock_quantity || 0;
            newQuantity = previousQuantity + movement.quantity;

            if (newQuantity < 0) {
                return { success: false, error: `Cannot reduce stock below 0. Current: ${previousQuantity}, Adjustment: ${movement.quantity}` };
            }

            await productRef.update({
                stock_quantity: newQuantity,
                updated_at: FieldValue.serverTimestamp()
            });
        }

        // Record the movement
        await adminDb.collection('stock_movements').add({
            ...movement,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            created_at: FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/stock');

        return { success: true };

    } catch (error: any) {
        console.error('[recordStockMovement] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get stock movement history
 */
export async function getStockMovements(limit = 50): Promise<StockMovement[]> {
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
 * Get products with variants for selection dropdown
 */
export async function getProductsForAdjustment() {
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
