import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { serializeDocs } from '@/lib/serialize-firestore';
import ShopClient from './shop-client';

export const revalidate = 60; // ISR: Refresh every 1 minute

async function getProducts(): Promise<Product[]> {
    try {
        const snapshot = await adminDb
            .collection('products')
            .where('stock_status', '!=', 'ARCHIVED')
            .get();

        if (snapshot.empty) return [];

        return serializeDocs<Product>(snapshot);
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

async function getCategories() {
    try {
        const snapshot = await adminDb.collection('categories').get();
        if (snapshot.empty) return [];

        const categories = snapshot.docs.map(doc => ({
            name: doc.data().name,
            slug: doc.data().slug,
            product_count: 0
        }));

        // Get product counts per category
        const products = await getProducts();
        categories.forEach(cat => {
            cat.product_count = products.filter(p => p.category_slug === cat.slug).length;
        });

        // Sort by product count descending
        return categories.sort((a, b) => b.product_count - a.product_count);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

export default async function ShopPage() {
    const [products, categories] = await Promise.all([
        getProducts(),
        getCategories()
    ]);

    return <ShopClient initialProducts={products} categories={categories} />;
}
