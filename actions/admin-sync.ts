'use server';
import { requireRole } from '@/actions/session-actions';
import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { ProductVariant, VariantOption } from '@/types';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * One-time catalog import from Loyverse.
 * Imports product names, SKUs, prices into Firebase.
 * Sets stock_quantity = 0 for all imported items — run Bulk Stock Entry afterwards.
 */
export async function importLoyverseProducts() {
    await requireRole(['owner', 'staff', 'warehouse']);

    const stats = { created: 0, updated: 0, errors: [] as string[] };
    try {
        const itemsData = await loyverse.getItems();
        const items = itemsData.items || [];

        for (const lvItem of items) {
            try {
                const primarySku = lvItem.variants[0]?.sku;
                if (!primarySku) continue;

                const productQuery = adminDb.collection('products').where('sku', '==', primarySku).limit(1);
                const productSnap = await productQuery.get();

                // Build canonical product.options from Loyverse dimension names.
                // Only include dimensions that have at least one variant with a value.
                const optionDimensions = [
                    { name: lvItem.option1_name as string | null, valueKey: 'option1_value' },
                    { name: lvItem.option2_name as string | null, valueKey: 'option2_value' },
                    { name: lvItem.option3_name as string | null, valueKey: 'option3_value' },
                ].filter(d => d.name);

                const productOptions: VariantOption[] = [];
                for (const dim of optionDimensions) {
                    const values = [
                        ...new Set(lvItem.variants.map((v: any) => v[dim.valueKey]).filter(Boolean))
                    ] as string[];
                    if (values.length > 0) productOptions.push({ name: dim.name!, values });
                }

                const variants: ProductVariant[] = lvItem.variants.map((v: any) => {
                    const price = parseFloat(v.price) || 0;

                    // Build variant.options using the SAME names as productOptions — no nulls.
                    // This is the canonical form: keys always match product.options[].name.
                    const variantOptions: Record<string, string> = {};
                    if (lvItem.option1_name && v.option1_value) variantOptions[lvItem.option1_name] = String(v.option1_value);
                    if (lvItem.option2_name && v.option2_value) variantOptions[lvItem.option2_name] = String(v.option2_value);
                    if (lvItem.option3_name && v.option3_value) variantOptions[lvItem.option3_name] = String(v.option3_value);

                    return {
                        id: v.variant_id,
                        sku: String(v.sku), // Normalize to string — Loyverse may return numeric SKUs
                        price,
                        stock_status: 'OUT' as const,
                        stock_quantity: 0,
                        reserved_quantity: 0,
                        options: variantOptions,
                        loyverse_variant_id: v.variant_id
                    };
                }).filter((v: any) => v.sku);

                const actualPrice = variants[0]?.price || 0;
                const variantSkus = variants.map(v => v.sku).filter(Boolean);

                const productData: any = {
                    name: lvItem.item_name,
                    description: lvItem.description || '',
                    images: lvItem.image_url ? [lvItem.image_url] : [],
                    stock_status: 'OUT',
                    updated_at: FieldValue.serverTimestamp(),
                    loyverse_id: lvItem.id,
                    variants,
                    options: productOptions,
                    variant_skus: variantSkus,
                    web_price: actualPrice,
                    stock_quantity: 0,
                    reserved_quantity: 0
                };

                if (!productSnap.empty) {
                    await productSnap.docs[0].ref.update({
                        name: productData.name,
                        description: productData.description,
                        loyverse_id: productData.loyverse_id,
                        web_price: actualPrice,
                        // Update options and variant_skus on re-import so they stay in sync
                        options: productOptions,
                        variant_skus: variantSkus,
                        updated_at: FieldValue.serverTimestamp()
                        // Do NOT overwrite stock quantities or variants on update
                    });
                    stats.updated++;
                } else {
                    productData.sku = primarySku;
                    productData.created_at = FieldValue.serverTimestamp();
                    productData.category_slug = 'uncategorized';
                    productData.is_featured = false;
                    productData.is_public = false;
                    productData.is_home_public = false;
                    productData.tags = [];
                    await adminDb.collection('products').add(productData);
                    stats.created++;
                }
            } catch (err: any) {
                stats.errors.push(`Item ${lvItem.item_name}: ${err.message}`);
            }
        }
        revalidatePath('/admin/products');
        return stats;
    } catch (error: any) {
        stats.errors.push(error.message);
        return stats;
    }
}

export async function fetchLoyverseProductBySku(sku: string) {
    await requireRole(['owner', 'staff', 'warehouse']);

    if (!sku) throw new Error('SKU is required');

    try {
        const itemsData = await loyverse.getItems();
        const items = itemsData.items || [];

        let foundItem: any = null;
        for (const item of items) {
            const hasSku = item.variants.some((v: any) => v.sku === sku);
            if (hasSku) { foundItem = item; break; }
        }

        if (!foundItem) return { success: false, error: 'Product SKU not found in Loyverse' };

        const variants: ProductVariant[] = foundItem.variants.map((v: any) => {
            const price = parseFloat(v.price) || 0;
            const variantOptions: Record<string, string> = {};
            if (foundItem.option1_name && v.option1_value) variantOptions[foundItem.option1_name] = String(v.option1_value);
            if (foundItem.option2_name && v.option2_value) variantOptions[foundItem.option2_name] = String(v.option2_value);
            if (foundItem.option3_name && v.option3_value) variantOptions[foundItem.option3_name] = String(v.option3_value);
            return {
                id: v.variant_id,
                sku: String(v.sku),
                price,
                stock_quantity: 0,
                reserved_quantity: 0,
                stock_status: 'OUT' as const,
                options: variantOptions,
                loyverse_variant_id: v.variant_id
            };
        });

        return {
            success: true,
            data: {
                name: foundItem.item_name,
                description: foundItem.description || '',
                web_price: variants[0]?.price || 0,
                variants,
                stock_quantity: 0
            }
        };
    } catch (error: any) {
        console.error('[fetchLoyverseProductBySku] Error:', error);
        return { success: false, error: error.message };
    }
}
