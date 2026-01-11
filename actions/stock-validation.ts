'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CartItem } from '@/types';

/**
 * Atomically validate and reserve stock for cart items
 * Uses Firestore transaction to prevent race conditions
 * 
 * This is CRITICAL for preventing overselling!
 */
export async function validateAndReserveStock(cartItems: CartItem[]) {
    try {
        const result = await adminDb.runTransaction(async (transaction) => {
            // ✅ PHASE 1: READ ALL PRODUCTS FIRST (before any writes)
            const productDocs = await Promise.all(
                cartItems.map(item => {
                    if (!item.id) return null;
                    const productRef = adminDb.collection('products').doc(item.id);
                    return transaction.get(productRef);
                })
            );

            // ✅ PHASE 2: VALIDATE ALL PRODUCTS
            const errors: string[] = [];
            const updates: Array<{ ref: any; item: CartItem; product: any }> = [];

            for (let i = 0; i < cartItems.length; i++) {
                const item = cartItems[i];
                const productDoc = productDocs[i];

                if (!item.id) {
                    errors.push(`${item.name}: Product ID missing`);
                    continue;
                }

                if (!productDoc || !productDoc.exists) {
                    errors.push(`${item.name}: Product not found`);
                    continue;
                }

                const product = productDoc.data();
                if (!product) {
                    errors.push(`${item.name}: Product data missing`);
                    continue;
                }

                const stockQuantity = product.stock_quantity || 0;
                const reservedQuantity = product.reserved_quantity || 0;
                const available = stockQuantity - reservedQuantity;

                if (available < item.quantity) {
                    errors.push(
                        `${item.name}: Only ${available} available (you requested ${item.quantity})`
                    );
                    continue;
                }

                // Prepare update
                updates.push({
                    ref: productDoc.ref,
                    item,
                    product
                });
            }

            // If any errors, abort transaction
            if (errors.length > 0) {
                throw new Error(errors.join('; '));
            }

            // ✅ PHASE 3: WRITE ALL UPDATES (after all reads complete)
            for (const { ref, item, product } of updates) {
                transaction.update(ref, {
                    reserved_quantity: (product.reserved_quantity || 0) + item.quantity,
                    updated_at: new Date()
                });
            }

            return { success: true };
        });

        return result;
    } catch (error) {
        console.error('[Stock Validation] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Stock validation failed'
        };
    }
}

/**
 * Release reserved stock (if checkout fails or expires)
 */
export async function releaseReservedStock(cartItems: CartItem[]) {
    try {
        await adminDb.runTransaction(async (transaction) => {
            // Read all first
            const productDocs = await Promise.all(
                cartItems.map(item => {
                    if (!item.id) return null;
                    const productRef = adminDb.collection('products').doc(item.id);
                    return transaction.get(productRef);
                })
            );

            // Then write
            for (let i = 0; i < cartItems.length; i++) {
                const item = cartItems[i];
                const productDoc = productDocs[i];

                if (!productDoc || !productDoc.exists) continue;

                const product = productDoc.data();
                if (!product) continue;

                const newReserved = Math.max(0, (product.reserved_quantity || 0) - item.quantity);

                transaction.update(productDoc.ref, {
                    reserved_quantity: newReserved,
                    updated_at: new Date()
                });
            }
        });

        console.log(`[Stock Release] Released reservations for ${cartItems.length} items`);
        return { success: true };
    } catch (error) {
        console.error('[Stock Release] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to release stock'
        };
    }
}

/**
 * Deduct stock after successful payment
 * This converts reserved stock to actual deduction
 */
export async function deductStock(cartItems: CartItem[]) {
    try {
        await adminDb.runTransaction(async (transaction) => {
            // Read all first
            const productDocs = await Promise.all(
                cartItems.map(item => {
                    if (!item.id) return null;
                    const productRef = adminDb.collection('products').doc(item.id);
                    return transaction.get(productRef);
                })
            );

            // Then write
            for (let i = 0; i < cartItems.length; i++) {
                const item = cartItems[i];
                const productDoc = productDocs[i];

                if (!productDoc || !productDoc.exists) continue;

                const product = productDoc.data();
                if (!product) continue;

                transaction.update(productDoc.ref, {
                    stock_quantity: Math.max(0, (product.stock_quantity || 0) - item.quantity),
                    reserved_quantity: Math.max(0, (product.reserved_quantity || 0) - item.quantity),
                    updated_at: new Date()
                });
            }
        });

        console.log(`[Stock Deduction] Deducted stock for ${cartItems.length} items`);
        return { success: true };
    } catch (error) {
        console.error('[Stock Deduction] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to deduct stock'
        };
    }
}
