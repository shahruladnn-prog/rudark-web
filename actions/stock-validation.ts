'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CartItem } from '@/types';
import { requireRole } from '@/actions/session-actions';

/**
 * Pre-flight stock check for checkout page.
 * Read-only — does NOT reserve stock. Returns per-item error messages.
 */
export async function checkCartStock(cartItems: { id?: string; sku: string; quantity: number; name: string; selected_options?: Record<string, string> }[]) {
    try {
        const uniqueProductIds = Array.from(new Set(cartItems.map(i => i.id).filter(Boolean))) as string[];
        const snapshots = await Promise.all(
            uniqueProductIds.map(id => adminDb.collection('products').doc(id).get())
        );
        const productMap: Record<string, any> = {};
        snapshots.forEach(snap => { if (snap.exists) productMap[snap.id] = snap.data(); });

        const errors: string[] = [];

        for (const item of cartItems) {
            if (!item.id || !productMap[item.id]) {
                errors.push(`${item.name}: Product not found`);
                continue;
            }
            const product = productMap[item.id];
            const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
            const hasVariants = product.variants && product.variants.length > 0;

            if (hasVariantOptions && hasVariants) {
                const variant = product.variants.find((v: any) =>
                    Object.entries(item.selected_options!).every(([k, val]) => v.options[k] === val)
                );
                if (!variant) {
                    const label = Object.values(item.selected_options!).join(' / ');
                    errors.push(`${item.name} (${label}): Variant not found`);
                    continue;
                }
                const available = Math.max(0, (variant.stock_quantity || 0) - (variant.reserved_quantity || 0));
                if (available < item.quantity) {
                    const label = Object.values(item.selected_options!).join(' / ');
                    errors.push(`${item.name} (${label}): Only ${available} available — you need ${item.quantity}`);
                }
            } else {
                const available = Math.max(0, (product.stock_quantity || 0) - (product.reserved_quantity || 0));
                if (available < item.quantity) {
                    errors.push(`${item.name}: Only ${available} available — you need ${item.quantity}`);
                }
            }
        }

        return { success: errors.length === 0, errors };
    } catch (error) {
        console.error('[checkCartStock] Error:', error);
        return { success: false, errors: ['Failed to check stock. Please try again.'] };
    }
}

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
 * Release reserved stock for a specific order (used by webhook on payment failure)
 * Does not require admin auth — called internally from webhook handler
 */
export async function releaseOrderStock(orderId: string) {
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) return { success: false, error: 'Order not found' };
    const order = orderDoc.data();
    if (!order?.items?.length) return { success: true }; // nothing to release
    return await releaseReservedStock(order.items as CartItem[]);
}

/**
 * Admin: Reset ALL reserved quantities to 0 across all products.
 * Use when stale reservations from abandoned checkouts are blocking sales.
 */
export async function resetAllReservedQuantities() {
    await requireRole(['owner']);

    const productsSnap = await adminDb.collection('products').get();
    let batch = adminDb.batch();
    let batchCount = 0;
    let fixed = 0;

    for (const doc of productsSnap.docs) {
        const data = doc.data();
        const hasReserved =
            (data.reserved_quantity || 0) > 0 ||
            (data.variants || []).some((v: any) => (v.reserved_quantity || 0) > 0);

        if (!hasReserved) continue;

        const update: any = { reserved_quantity: 0 };
        if (data.variants?.length > 0) {
            update.variants = data.variants.map((v: any) => ({ ...v, reserved_quantity: 0 }));
        }
        batch.update(doc.ref, update);
        batchCount++;
        fixed++;

        if (batchCount === 499) {
            await batch.commit();
            batch = adminDb.batch();
            batchCount = 0;
        }
    }
    if (batchCount > 0) await batch.commit();

    return { success: true, fixed };
}

/**
 * Admin: One-time migration to normalize variant.options keys across all products.
 *
 * Firestore variant.options may have stale keys from Loyverse import (e.g. "Variant": "Blue")
 * that don't match product.options[].name (e.g. "Design"). This remaps keys positionally
 * so they match, and strips null/undefined values. Also populates variant_skus if missing.
 *
 * Safe to re-run — idempotent. Run once after deploy, then any time a re-import is done.
 */
export async function repairVariantOptionKeys() {
    await requireRole(['owner']);

    const productsSnap = await adminDb.collection('products').get();
    let batch = adminDb.batch();
    let batchCount = 0;
    let fixed = 0;
    let skipped = 0;

    for (const doc of productsSnap.docs) {
        const data = doc.data();
        const options: Array<{ name: string; values: string[] }> = data.options || [];
        const variants: any[] = data.variants || [];

        if (!variants.length) { skipped++; continue; }

        let changed = false;

        const repairedVariants = variants.map((v: any) => {
            // Extract existing values positionally (strip nulls/undefined/empty)
            const rawValues = Object.values(v.options || {}).filter((val): val is string => Boolean(val));

            let normalized: Record<string, string>;

            if (options.length > 0) {
                // Map by position to current product.options[].name
                normalized = {};
                options.forEach((opt, i) => {
                    if (rawValues[i]) normalized[opt.name] = rawValues[i];
                });
            } else {
                // No product.options defined — keep existing values but strip nulls
                normalized = {};
                Object.entries(v.options || {}).forEach(([k, val]) => {
                    if (val) normalized[k] = String(val);
                });
            }

            // Detect if anything changed (key names or null removal)
            const oldStr = JSON.stringify(v.options || {});
            const newStr = JSON.stringify(normalized);
            if (oldStr !== newStr) changed = true;

            // Normalize SKU to string
            const normalizedSku = v.sku !== undefined ? String(v.sku) : v.sku;
            if (normalizedSku !== v.sku) changed = true;

            return { ...v, sku: normalizedSku, options: normalized };
        });

        // Also ensure variant_skus field exists (needed for /api/stock Phase 2 lookup)
        const variantSkus = repairedVariants.map(v => v.sku).filter(Boolean);
        const existingVariantSkus: string[] = data.variant_skus || [];
        const variantSkusMatch =
            variantSkus.length === existingVariantSkus.length &&
            variantSkus.every((s, i) => s === existingVariantSkus[i]);
        if (!variantSkusMatch) changed = true;

        if (!changed) { skipped++; continue; }

        batch.update(doc.ref, {
            variants: repairedVariants,
            variant_skus: variantSkus,
            updated_at: new Date()
        });
        batchCount++;
        fixed++;

        if (batchCount === 499) {
            await batch.commit();
            batch = adminDb.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) await batch.commit();

    console.log(`[repairVariantOptionKeys] Fixed: ${fixed}, Skipped (no change): ${skipped}`);
    return { success: true, fixed, skipped };
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
