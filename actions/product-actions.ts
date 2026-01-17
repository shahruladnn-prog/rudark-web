'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Get all products for admin listing
 */
export async function getProducts() {
    try {
        // Limit to 500 products for performance
        const snapshot = await adminDb.collection('products').orderBy('created_at', 'desc').limit(500).get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                sku: data.sku || doc.id, // Use actual SKU, fallback to doc.id
                category_slug: data.category_slug || null,
                subcategory_slug: data.subcategory_slug || null,
                category: data.category_slug || '-',
                web_price: data.web_price || 0,
                price: data.web_price || 0,
                promo_price: data.promo_price || null,
                stock_quantity: data.stock_quantity ?? 0,
                reserved_quantity: data.reserved_quantity ?? 0,
                stock_status: data.stock_status || 'UNKNOWN',
                variants: data.variants || [], // Include variants for stock display
                images: data.images || [],
                created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
                updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
            };
        });
    } catch (error) {
        console.error('[getProducts] Error:', error);
        return [];
    }
}

export async function saveProduct(productData: Partial<Product>) {
    try {
        const { id, ...data } = productData;

        // Ensure numeric values are numbers
        if (data.web_price) data.web_price = Number(data.web_price);
        if (data.promo_price) data.promo_price = Number(data.promo_price);

        // Handle Shipping/Parcel Configs (Allow NULL for inheritance)
        const numericFields = ['markup_amount', 'shipping_markup_percent', 'handling_fee', 'weight', 'width', 'length', 'height'];
        numericFields.forEach(field => {
            const dataAny = data as any;
            if (dataAny[field] === '' || dataAny[field] === undefined) {
                // If empty string, set to null to enable category inheritance
                dataAny[field] = null;
            } else {
                // Otherwise cast to number
                dataAny[field] = Number(dataAny[field]);
            }
        });

        // Add timestamps
        const now = new Date().toISOString();
        const payload = {
            ...data,
            updated_at: now
        };

        if (id) {
            // Update existing
            await adminDb.collection('products').doc(id).update(payload);
        } else {
            // Create new (Custom Draft)
            const newDoc = await adminDb.collection('products').add({
                ...payload,
                created_at: now,
                stock_status: 'IN_STOCK', // Default for custom items
                sku: data.sku || `CUSTOM-${Date.now()}` // Fallback SKU
            });
        }

        revalidatePath('/admin/products');
        revalidatePath(`/admin/products/${id}`);
        revalidatePath('/shop', 'layout'); // Update all shop listing pages
        revalidatePath('/', 'layout'); // Update everything to be safe

        return { success: true };
    } catch (error) {
        console.error('Error saving product:', error);
        return { success: false, error: 'Failed to save product' };
    }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string) {
    try {
        await adminDb.collection('products').doc(id).delete();
        revalidatePath('/admin/products');
        return { success: true };
    } catch (error: any) {
        console.error('[deleteProduct] Error:', error);
        return { success: false, error: error.message };
    }
}
