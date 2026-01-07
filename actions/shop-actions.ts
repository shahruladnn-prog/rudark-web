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

export async function getProductsBySlug(slugs: string[]) {
    console.log('--- getProductsBySlug STARTED ---', slugs);
    try {
        const [categorySlug, subcategorySlug] = slugs;
        let query: FirebaseFirestore.Query = adminDb.collection('products');

        // 1. Get Category Details
        let categoryName = '';
        let subcategoryName = null;

        try {
            const catSnapshot = await adminDb.collection('categories').where('slug', '==', categorySlug).limit(1).get();
            if (!catSnapshot.empty) {
                const catData = catSnapshot.docs[0].data();
                categoryName = catData.name;

                if (subcategorySlug && catData.subcategories) {
                    const sub = catData.subcategories.find((s: any) => s.slug === subcategorySlug);
                    if (sub) subcategoryName = sub.name;
                }
            } else {
                categoryName = categorySlug.toUpperCase().replace('-', ' ');
            }
        } catch (catError) {
            console.error('Error fetching category:', catError);
            categoryName = categorySlug.toUpperCase().replace('-', ' ');
        }

        // 2. Query Products by SLUGS
        query = query.where('category_slug', '==', categorySlug);

        if (subcategorySlug) {
            query = query.where('subcategory_slug', '==', subcategorySlug);
        }

        const snapshot = await query.get();
        console.log(`Query Products Found: ${snapshot.size} for ${categorySlug}/${subcategorySlug}`);

        const products = snapshot.docs.map(doc => {
            return {
                id: doc.id,
                ...sanitizeFirestoreData(doc.data()) // Deep sanitize ALL fields
            };
        }) as Product[];

        return { products, categoryName, subcategoryName };

    } catch (error) {
        console.error('CRITICAL ERROR in getProductsBySlug:', error);
        return { products: [], categoryName: null };
    }
}
