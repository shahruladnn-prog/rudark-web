'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { revalidatePath } from 'next/cache';

export async function saveProduct(productData: Partial<Product>) {
    try {
        const { id, ...data } = productData;

        // Ensure numeric values are numbers
        if (data.web_price) data.web_price = Number(data.web_price);
        if (data.promo_price) data.promo_price = Number(data.promo_price);

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
        revalidatePath('/'); // Update homepage if featured

        return { success: true };
    } catch (error) {
        console.error('Error saving product:', error);
        return { success: false, error: 'Failed to save product' };
    }
}
