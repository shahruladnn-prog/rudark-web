'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CartItem } from '@/types';

/**
 * Atomically validate and reserve stock for cart items
 * Uses Firestore transaction to prevent race conditions
 * 
 * FIX: Aggregates updates per product to avoid overwriting writes 
 * when multiple variants of the same product are in the cart.
 */
export async function validateAndReserveStock(cartItems: CartItem[]) {
    try {
        const result = await adminDb.runTransaction(async (transaction) => {
            // 1. Get unique product IDs to read
            const uniqueProductIds = Array.from(new Set(cartItems.map(item => item.id).filter(Boolean))) as string[];
            
            // 2. READ Phase
            const productSnapshots = await Promise.all(
                uniqueProductIds.map(id => transaction.get(adminDb.collection('products').doc(id)))
            );
            
            const productDataMap: Record<string, any> = {};
            productSnapshots.forEach(snap => {
                if (snap.exists) {
                    productDataMap[snap.id] = {
                        data: snap.data(),
                        ref: snap.ref
                    };
                }
            });

            // 3. VALIDATE & AGGREGATE Phase
            const errors: string[] = [];
            const productUpdates: Record<string, any> = {};

            for (const item of cartItems) {
                if (!item.id) {
                    errors.push(`${item.name}: Product ID missing`);
                    continue;
                }

                const productEntry = productDataMap[item.id];
                if (!productEntry) {
                    errors.push(`${item.name}: Product not found`);
                    continue;
                }

                // Use existing update state if available, otherwise start with fresh data
                const currentProductState = productUpdates[item.id] || JSON.parse(JSON.stringify(productEntry.data));
                
                const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
                const hasVariants = currentProductState.variants && currentProductState.variants.length > 0;

                if (hasVariantOptions && hasVariants) {
                    const variantIndex = currentProductState.variants.findIndex((v: any) => {
                        if (!v.options) return false;
                        return Object.entries(item.selected_options!).every(
                            ([key, value]) => v.options[key] === value
                        );
                    });

                    if (variantIndex === -1) {
                        const optionsStr = Object.entries(item.selected_options!).map(([k, v]) => `${k}: ${v}`).join(', ');
                        errors.push(`${item.name} (${optionsStr}): Variant not found`);
                        continue;
                    }

                    const variant = currentProductState.variants[variantIndex];
                    const available = (variant.stock_quantity || 0) - (variant.reserved_quantity || 0);

                    if (available < item.quantity) {
                        const label = Object.values(item.selected_options!).join(' / ');
                        errors.push(`${item.name} (${label}): Only ${available} available (requested ${item.quantity})`);
                        continue;
                    }

                    // Apply update to in-memory state
                    variant.reserved_quantity = (variant.reserved_quantity || 0) + item.quantity;
                    currentProductState.reserved_quantity = (currentProductState.reserved_quantity || 0) + item.quantity;
                } else {
                    const available = (currentProductState.stock_quantity || 0) - (currentProductState.reserved_quantity || 0);
                    if (available < item.quantity) {
                        errors.push(`${item.name}: Only ${available} available (requested ${item.quantity})`);
                        continue;
                    }

                    // Apply update to in-memory state
                    currentProductState.reserved_quantity = (currentProductState.reserved_quantity || 0) + item.quantity;
                }
                
                productUpdates[item.id] = currentProductState;
            }

            if (errors.length > 0) throw new Error(errors.join('; '));

            // 4. WRITE Phase
            for (const [id, updatedData] of Object.entries(productUpdates)) {
                transaction.update(productDataMap[id].ref, {
                    ...updatedData,
                    updated_at: new Date()
                });
            }

            return { success: true };
        });

        return result;
    } catch (error) {
        console.error('[Stock Validation] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Stock validation failed' };
    }
}

/**
 * Release reserved stock
 */
export async function releaseReservedStock(cartItems: CartItem[]) {
    try {
        await adminDb.runTransaction(async (transaction) => {
            const uniqueProductIds = Array.from(new Set(cartItems.map(item => item.id).filter(Boolean))) as string[];
            const snapshots = await Promise.all(uniqueProductIds.map(id => transaction.get(adminDb.collection('products').doc(id))));
            
            const productUpdates: Record<string, any> = {};
            const productRefs: Record<string, any> = {};
            
            snapshots.forEach(snap => {
                if (snap.exists) {
                    productUpdates[snap.id] = JSON.parse(JSON.stringify(snap.data()));
                    productRefs[snap.id] = snap.ref;
                }
            });

            for (const item of cartItems) {
                if (!item.id || !productUpdates[item.id]) continue;
                
                const state = productUpdates[item.id];
                const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
                
                if (hasVariantOptions && state.variants) {
                    const idx = state.variants.findIndex((v: any) => 
                        v.options && Object.entries(item.selected_options!).every(([k, val]) => v.options[k] === val)
                    );
                    if (idx !== -1) {
                        state.variants[idx].reserved_quantity = Math.max(0, (state.variants[idx].reserved_quantity || 0) - item.quantity);
                        state.reserved_quantity = state.variants.reduce((sum: number, v: any) => sum + (v.reserved_quantity || 0), 0);
                    }
                } else {
                    state.reserved_quantity = Math.max(0, (state.reserved_quantity || 0) - item.quantity);
                }
            }

            for (const [id, updatedData] of Object.entries(productUpdates)) {
                transaction.update(productRefs[id], { ...updatedData, updated_at: new Date() });
            }
        });
        return { success: true };
    } catch (error) {
        console.error('[Stock Release] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to release stock' };
    }
}

/**
 * Deduct stock after successful payment
 */
export async function deductStock(cartItems: CartItem[]) {
    try {
        await adminDb.runTransaction(async (transaction) => {
            const uniqueProductIds = Array.from(new Set(cartItems.map(item => item.id).filter(Boolean))) as string[];
            const snapshots = await Promise.all(uniqueProductIds.map(id => transaction.get(adminDb.collection('products').doc(id))));
            
            const productUpdates: Record<string, any> = {};
            const productRefs: Record<string, any> = {};
            
            snapshots.forEach(snap => {
                if (snap.exists) {
                    productUpdates[snap.id] = JSON.parse(JSON.stringify(snap.data()));
                    productRefs[snap.id] = snap.ref;
                }
            });

            for (const item of cartItems) {
                if (!item.id || !productUpdates[item.id]) continue;
                
                const state = productUpdates[item.id];
                const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
                
                if (hasVariantOptions && state.variants) {
                    const idx = state.variants.findIndex((v: any) => 
                        v.options && Object.entries(item.selected_options!).every(([k, val]) => v.options[k] === val)
                    );
                    if (idx !== -1) {
                        const v = state.variants[idx];
                        v.stock_quantity = Math.max(0, (v.stock_quantity || 0) - item.quantity);
                        v.reserved_quantity = Math.max(0, (v.reserved_quantity || 0) - item.quantity);
                        state.stock_quantity = state.variants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
                        state.reserved_quantity = state.variants.reduce((sum: number, v: any) => sum + (v.reserved_quantity || 0), 0);
                    }
                } else {
                    state.stock_quantity = Math.max(0, (state.stock_quantity || 0) - item.quantity);
                    state.reserved_quantity = Math.max(0, (state.reserved_quantity || 0) - item.quantity);
                }
            }

            for (const [id, updatedData] of Object.entries(productUpdates)) {
                transaction.update(productRefs[id], { ...updatedData, updated_at: new Date() });
            }
        });
        return { success: true };
    } catch (error) {
        console.error('[Stock Deduction] Error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to deduct stock' };
    }
}
