'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';

const sanitizeFirestoreData = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (typeof data.toDate === 'function') return data.toDate().toISOString();
    if (Array.isArray(data)) return data.map(sanitizeFirestoreData);
    if (typeof data === 'object') {
        const sanitized: any = {};
        for (const key in data) {
            sanitized[key] = sanitizeFirestoreData(data[key]);
        }
        return sanitized;
    }
    return data;
};

import { promiseTimeout } from '@/lib/promise-utils';

export async function getProductsBySlug(slugs: string[]) {
    console.log('--- getProductsBySlug STARTED ---', slugs);
    try {
        const [categorySlug, subcategorySlug] = slugs;

        // 1. Prepare Category Details Promise
        const catDetailsPromise = (async () => {
            try {
                const catSnapshot = await adminDb.collection('categories').where('slug', '==', categorySlug).limit(1).get();
                if (!catSnapshot.empty) {
                    const catData = catSnapshot.docs[0].data();
                    let subcategoryName = null;
                    if (subcategorySlug && catData.subcategories) {
                        const sub = catData.subcategories.find((s: any) => s.slug === subcategorySlug);
                        if (sub) subcategoryName = sub.name;
                    }
                    return {
                        categoryName: catData.name,
                        subcategoryName,
                        markup_amount: catData.markup_amount,
                        handling_fee: catData.handling_fee
                    };
                }
                return { categoryName: categorySlug.toUpperCase().replace('-', ' '), subcategoryName: null };
            } catch (e) {
                console.error('Error fetching category:', e);
                return { categoryName: categorySlug.toUpperCase().replace('-', ' '), subcategoryName: null };
            }
        })();

        // 2. Prepare Products Promise
        const productsPromise = (async () => {
            let query: FirebaseFirestore.Query = adminDb.collection('products');
            query = query.where('category_slug', '==', categorySlug);

            if (subcategorySlug) {
                query = query.where('subcategory_slugs', 'array-contains', subcategorySlug);
            }

            const snapshot = await query.get();
            console.log(`Query Products Found: ${snapshot.size} for ${categorySlug}/${subcategorySlug}`);

            return snapshot.docs.map(doc => {
                return {
                    id: doc.id,
                    ...sanitizeFirestoreData(doc.data())
                };
            }) as Product[];
        })();

        // 3. Run in Parallel with Timeouts
        const [catDetails, rawProducts] = await Promise.all([
            promiseTimeout(catDetailsPromise, 5000, { categoryName: 'Loading...', subcategoryName: null }),
            promiseTimeout(productsPromise, 8000, [])
        ]);

        // 4. Merge Category Settings (Markup/Handling) into Products
        const products = rawProducts.map(p => ({
            ...p,
            // Inherit from Category if Product doesn't have it
            markup_amount: p.markup_amount ?? (catDetails as any).markup_amount ?? 0,
            shipping_markup_percent: p.shipping_markup_percent ?? (catDetails as any).shipping_markup_percent ?? 0,
            handling_fee: p.handling_fee ?? (catDetails as any).handling_fee ?? 0
        }));

        return { products, ...catDetails };

    } catch (error) {
        console.error('CRITICAL ERROR in getProductsBySlug:', error);
        return { products: [], categoryName: null };
    }
}
