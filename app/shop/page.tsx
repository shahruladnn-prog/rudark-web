import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { serializeDocs } from '@/lib/serialize-firestore';
import ShopClient from './shop-client';

// Statically generated — rebuilt via revalidatePath() from admin actions

export const metadata: Metadata = {
    title: "Shop | Rud'Ark PRO SHOP",
    description: "Browse our full range of premium technical gear — fins, masks, wetsuits, and more for serious aquatic athletes.",
    openGraph: {
        title: "Shop | Rud'Ark PRO SHOP",
        description: "Premium technical gear for aquatic dominance. Shop fins, masks, wetsuits and more.",
        url: 'https://rudark-web.vercel.app/shop',
        siteName: "Rud'Ark",
        images: [{ url: 'https://rudark-web.vercel.app/logo.png', width: 800, height: 800, alt: "Rud'Ark Logo" }],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: "Shop | Rud'Ark PRO SHOP",
        description: "Premium technical gear for aquatic dominance.",
        images: ['https://rudark-web.vercel.app/logo.png'],
    },
};

async function getProducts(): Promise<Product[]> {
    try {
        const snapshot = await adminDb
            .collection('products')
            .where('is_public', '==', true)
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
