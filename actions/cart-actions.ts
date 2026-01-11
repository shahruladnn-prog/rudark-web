'use server';

import { adminDb } from '@/lib/firebase-admin';

export interface ProductFeeData {
    id: string;
    shipping_markup_percent: number;
    handling_fee: number;
}

export async function getLatestProductFees(productIds: string[]): Promise<Record<string, ProductFeeData>> {
    if (!productIds.length) return {};

    try {
        console.log(`[CartValidation] Fetching fees for ${productIds.length} items`);

        // 1. Fetch all unique Products
        const uniqueIds = Array.from(new Set(productIds));
        const productRefs = uniqueIds.map(id => adminDb.collection('products').doc(id));
        const productSnapshots = await adminDb.getAll(...productRefs);

        // 2. Fetch all Categories (Optimized: just fetch all, usually small count, or we can fetch unique slugs)
        // For simplicity and speed (since Categories are few), let's fetch all or cache them.
        // Actually, let's just collect the slugs we need.
        const categorySlugs = new Set<string>();
        const products: any[] = [];

        productSnapshots.forEach(snap => {
            if (snap.exists) {
                const data = snap.data();
                products.push({ id: snap.id, ...data });
                if (data?.category_slug) categorySlugs.add(data.category_slug);
            }
        });

        // 3. Fetch specific Categories
        const categories: Record<string, any> = {};
        if (categorySlugs.size > 0) {
            const catQuery = await adminDb.collection('categories').where('slug', 'in', Array.from(categorySlugs)).get();
            catQuery.forEach(doc => {
                categories[doc.data().slug] = doc.data();
            });
        }

        // 4. Resolve Fees (Inheritance Logic)
        const feeMap: Record<string, ProductFeeData> = {};

        products.forEach(p => {
            const cat = p.category_slug ? categories[p.category_slug] : null;

            // Inheritance: Product > Category > Default(0)
            const finalMarkupPercent = p.shipping_markup_percent ?? (cat?.shipping_markup_percent) ?? 0;
            const finalHandlingFee = p.handling_fee ?? (cat?.handling_fee) ?? 0;

            feeMap[p.id] = {
                id: p.id,
                shipping_markup_percent: Number(finalMarkupPercent),
                handling_fee: Number(finalHandlingFee)
            };
        });

        console.log(`[CartValidation] Resolved fees for ${Object.keys(feeMap).length} products.`);
        return feeMap;

    } catch (error) {
        console.error('[CartValidation] Error:', error);
        return {};
    }
}
