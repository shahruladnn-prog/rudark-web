'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CartItem } from '@/types';

/**
 * Atomically validate and reserve stock for cart items
 * Uses Firestore transaction to prevent race conditions
 * 
 * This is CRITICAL for preventing overselling!
 * 
 * UPDATED: Now validates at variant level when selected_options present
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
            const updates: Array<{
                ref: any;
                item: CartItem;
                product: any;
                variantIndex?: number;  // Track which variant to update
            }> = [];

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

                // Check if this is a variant purchase (has selected_options)
                const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
                const hasVariants = product.variants && product.variants.length > 0;

                if (hasVariantOptions && hasVariants) {
                    // ✅ VARIANT-LEVEL VALIDATION
                    // Find the matching variant based on selected_options
                    const variantIndex = product.variants.findIndex((v: any) => {
                        if (!v.options) return false;
                        // Check if all selected options match the variant options
                        return Object.entries(item.selected_options!).every(
                            ([key, value]) => v.options[key] === value
                        );
                    });

                    if (variantIndex === -1) {
                        // Create readable options string for error
                        const optionsStr = Object.entries(item.selected_options!)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ');
                        errors.push(`${item.name} (${optionsStr}): Variant not found`);
                        continue;
                    }

                    const variant = product.variants[variantIndex];
                    const variantStock = variant.stock_quantity || 0;
                    const variantReserved = variant.reserved_quantity || 0;
                    const variantAvailable = variantStock - variantReserved;

                    // Create readable option label for error messages
                    const optionLabel = Object.values(item.selected_options!).join(' / ');

                    if (variantAvailable < item.quantity) {
                        errors.push(
                            `${item.name} (${optionLabel}): Only ${variantAvailable} available (you requested ${item.quantity})`
                        );
                        continue;
                    }

                    // Prepare variant-level update
                    updates.push({
                        ref: productDoc.ref,
                        item,
                        product,
                        variantIndex  // Track which variant to update
                    });

                } else {
                    // ✅ PARENT-LEVEL VALIDATION (no variants or no options selected)
                    const stockQuantity = product.stock_quantity || 0;
                    const reservedQuantity = product.reserved_quantity || 0;
                    const available = stockQuantity - reservedQuantity;

                    if (available < item.quantity) {
                        errors.push(
                            `${item.name}: Only ${available} available (you requested ${item.quantity})`
                        );
                        continue;
                    }

                    // Prepare parent-level update
                    updates.push({
                        ref: productDoc.ref,
                        item,
                        product
                    });
                }
            }

            // If any errors, abort transaction
            if (errors.length > 0) {
                throw new Error(errors.join('; '));
            }

            // ✅ PHASE 3: WRITE ALL UPDATES (after all reads complete)
            for (const { ref, item, product, variantIndex } of updates) {
                if (variantIndex !== undefined) {
                    // Update variant-level reserved quantity
                    const updatedVariants = [...product.variants];
                    updatedVariants[variantIndex] = {
                        ...updatedVariants[variantIndex],
                        reserved_quantity: (updatedVariants[variantIndex].reserved_quantity || 0) + item.quantity
                    };

                    // Also update parent reserved (sum of all variants)
                    const newParentReserved = updatedVariants.reduce(
                        (sum: number, v: any) => sum + (v.reserved_quantity || 0), 0
                    );

                    transaction.update(ref, {
                        variants: updatedVariants,
                        reserved_quantity: newParentReserved,
                        updated_at: new Date()
                    });
                } else {
                    // Update parent-level only
                    transaction.update(ref, {
                        reserved_quantity: (product.reserved_quantity || 0) + item.quantity,
                        updated_at: new Date()
                    });
                }
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
 * UPDATED: Now handles variant-level reservations
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

                // Check if this is a variant purchase
                const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
                const hasVariants = product.variants && product.variants.length > 0;

                if (hasVariantOptions && hasVariants) {
                    // Find the matching variant
                    const variantIndex = product.variants.findIndex((v: any) => {
                        if (!v.options) return false;
                        return Object.entries(item.selected_options!).every(
                            ([key, value]) => v.options[key] === value
                        );
                    });

                    if (variantIndex !== -1) {
                        const updatedVariants = [...product.variants];
                        updatedVariants[variantIndex] = {
                            ...updatedVariants[variantIndex],
                            reserved_quantity: Math.max(0, (updatedVariants[variantIndex].reserved_quantity || 0) - item.quantity)
                        };

                        // Update parent reserved (sum of all variants)
                        const newParentReserved = updatedVariants.reduce(
                            (sum: number, v: any) => sum + (v.reserved_quantity || 0), 0
                        );

                        transaction.update(productDoc.ref, {
                            variants: updatedVariants,
                            reserved_quantity: newParentReserved,
                            updated_at: new Date()
                        });
                    }
                } else {
                    // Parent-level release
                    const newReserved = Math.max(0, (product.reserved_quantity || 0) - item.quantity);
                    transaction.update(productDoc.ref, {
                        reserved_quantity: newReserved,
                        updated_at: new Date()
                    });
                }
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
 * UPDATED: Now handles variant-level deductions
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

                // Check if this is a variant purchase
                const hasVariantOptions = item.selected_options && Object.keys(item.selected_options).length > 0;
                const hasVariants = product.variants && product.variants.length > 0;

                if (hasVariantOptions && hasVariants) {
                    // Find the matching variant
                    const variantIndex = product.variants.findIndex((v: any) => {
                        if (!v.options) return false;
                        return Object.entries(item.selected_options!).every(
                            ([key, value]) => v.options[key] === value
                        );
                    });

                    if (variantIndex !== -1) {
                        const updatedVariants = [...product.variants];
                        const variant = updatedVariants[variantIndex];

                        updatedVariants[variantIndex] = {
                            ...variant,
                            stock_quantity: Math.max(0, (variant.stock_quantity || 0) - item.quantity),
                            reserved_quantity: Math.max(0, (variant.reserved_quantity || 0) - item.quantity)
                        };

                        // Update parent totals (sum of all variants)
                        const newParentStock = updatedVariants.reduce(
                            (sum: number, v: any) => sum + (v.stock_quantity || 0), 0
                        );
                        const newParentReserved = updatedVariants.reduce(
                            (sum: number, v: any) => sum + (v.reserved_quantity || 0), 0
                        );

                        transaction.update(productDoc.ref, {
                            variants: updatedVariants,
                            stock_quantity: newParentStock,
                            reserved_quantity: newParentReserved,
                            updated_at: new Date()
                        });
                    }
                } else {
                    // Parent-level deduction
                    transaction.update(productDoc.ref, {
                        stock_quantity: Math.max(0, (product.stock_quantity || 0) - item.quantity),
                        reserved_quantity: Math.max(0, (product.reserved_quantity || 0) - item.quantity),
                        updated_at: new Date()
                    });
                }
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
