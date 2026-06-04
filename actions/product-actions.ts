'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Get all products for admin listing
 */
export async function getProducts() {
    await requireRole(['owner', 'staff']);

    try {
        const snapshot = await adminDb
            .collection('products')
            .select('name', 'sku', 'category_slug', 'subcategory_slug', 'web_price', 'promo_price',
                    'stock_quantity', 'reserved_quantity', 'stock_status', 'variants', 'created_at', 'updated_at',
                    'reorder_point', 'safety_stock', 'is_public', 'is_home_public')
            .orderBy('created_at', 'desc')
            .limit(500)
            .get();

        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                sku: data.sku || doc.id,
                category_slug: data.category_slug || null,
                subcategory_slug: data.subcategory_slug || null,
                category: data.category_slug || '-',
                web_price: data.web_price || 0,
                price: data.web_price || 0,
                promo_price: data.promo_price || null,
                stock_quantity: data.stock_quantity ?? 0,
                reserved_quantity: data.reserved_quantity ?? 0,
                stock_status: data.stock_status || 'UNKNOWN',
                is_public: data.is_public ?? false,
                is_home_public: data.is_home_public ?? false,
                variants: data.variants || [],
                reorder_point: data.reorder_point,
                safety_stock: data.safety_stock,
                created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
                updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
            };
        });
    } catch (error) {
        console.error('[getProducts] Error:', error);
        return [];
    }
}

export async function toggleProductVisibility(id: string, field: 'is_public' | 'is_home_public', current: boolean) {
    await requireRole(['owner', 'staff']);

    try {
        const productSnap = await adminDb.collection('products').doc(id).get();
        const sku = productSnap.data()?.sku;
        await adminDb.collection('products').doc(id).update({
            [field]: !current,
            updated_at: FieldValue.serverTimestamp()
        });
        // Only bust the specific product page + admin listing — not entire shop/catalog/home
        revalidatePath('/admin/products');
        if (sku) revalidatePath(`/product/${sku}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveProduct(productData: Partial<Product>) {
    await requireRole(['owner', 'staff']);

    try {
        const { id, ...data } = productData;

        if (data.web_price) data.web_price = Number(data.web_price);
        if (data.promo_price) data.promo_price = Number(data.promo_price);

        const numericFields = ['markup_amount', 'shipping_markup_percent', 'handling_fee', 'weight', 'width', 'length', 'height'];
        numericFields.forEach(field => {
            const dataAny = data as any;
            if (dataAny[field] === '' || dataAny[field] === undefined) {
                dataAny[field] = null;
            } else {
                const num = Number(dataAny[field]);
                dataAny[field] = isNaN(num) ? null : num;
            }
        });

        // Normalize variant.options keys to match product.options[].name by position.
        // This keeps the schema canonical even when the admin renames an option.
        if (data.options?.length && data.variants?.length) {
            data.variants = data.variants.map((v: any) => {
                const oldValues = Object.values(v.options || {}).filter((val): val is string => Boolean(val));
                const normalized: Record<string, string> = {};
                (data.options as any[]).forEach((opt: any, i: number) => {
                    if (oldValues[i]) normalized[opt.name] = oldValues[i];
                });
                return { ...v, options: normalized };
            });
        }

        // Always maintain variant_skus as a flat string array so /api/stock can find variant stock
        const variantSkus = (data.variants || []).map((v: any) => String(v.sku)).filter(Boolean);

        const payload = {
            ...data,
            variant_skus: variantSkus.length > 0 ? variantSkus : [],
            updated_at: FieldValue.serverTimestamp()
        };

        let oldSku: string | undefined;
        if (id) {
            const existingDoc = await adminDb.collection('products').doc(id).get();
            oldSku = existingDoc.data()?.sku;
        }

        if (id) {
            await adminDb.collection('products').doc(id).update(payload);
        } else {
            await adminDb.collection('products').add({
                ...payload,
                created_at: FieldValue.serverTimestamp(),
                stock_status: data.stock_status || 'IN_STOCK',
                stock_quantity: data.stock_quantity ?? 0,
                reserved_quantity: data.reserved_quantity ?? 0,
                sku: data.sku || `CUSTOM-${Date.now()}`
            });
        }

        // Bust specific pages only — /shop, /catalog, / have revalidate=3600 ISR
        // and don't need forced revalidation on every product edit. This prevents
        // ISR write unit spikes on bulk saves or rapid edits.
        revalidatePath('/admin/products');
        if (id) revalidatePath(`/admin/products/${id}`);

        const currentSku = data.sku;
        if (currentSku) revalidatePath(`/product/${currentSku}`);
        if (oldSku && oldSku !== currentSku) revalidatePath(`/product/${oldSku}`);

        return { success: true };
    } catch (error) {
        console.error('Error saving product:', error);
        return { success: false, error: 'Failed to save product' };
    }
}

export async function deleteProduct(id: string) {
    await requireRole(['owner', 'staff']);

    try {
        const productRef = adminDb.collection('products').doc(id);
        const productSnap = await productRef.get();
        const sku = productSnap.data()?.sku;

        await productRef.delete();

        revalidatePath('/admin/products');
        if (sku) revalidatePath(`/product/${sku}`);
        return { success: true };
    } catch (error: any) {
        console.error('[deleteProduct] Error:', error);
        return { success: false, error: error.message };
    }
}
