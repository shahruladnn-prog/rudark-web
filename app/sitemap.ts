import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase-admin';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace('http://localhost:3000', 'https://rudark-web.vercel.app') || 'https://rudark-web.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        { url: BASE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
        { url: `${BASE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
        { url: `${BASE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    ];

    try {
        const [productsSnap, categoriesSnap] = await Promise.all([
            adminDb.collection('products')
                .select('sku', 'updated_at', 'stock_status')
                .limit(500)
                .get(),
            adminDb.collection('categories').get(),
        ]);

        const productPages: MetadataRoute.Sitemap = productsSnap.docs
            .filter(doc => doc.data().stock_status !== 'ARCHIVED')
            .map(doc => {
                const data = doc.data();
                return {
                    url: `${BASE_URL}/product/${data.sku}`,
                    lastModified: data.updated_at?.toDate?.() ?? now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.85,
                };
            });

        const categoryPages: MetadataRoute.Sitemap = categoriesSnap.docs.flatMap(doc => {
            const data = doc.data();
            const pages: MetadataRoute.Sitemap = [{
                url: `${BASE_URL}/shop/${data.slug}`,
                lastModified: now,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            }];
            for (const sub of (data.subcategories || [])) {
                pages.push({
                    url: `${BASE_URL}/shop/${data.slug}/${sub.slug}`,
                    lastModified: now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.6,
                });
            }
            return pages;
        });

        return [...staticPages, ...productPages, ...categoryPages];
    } catch (error) {
        console.error('[sitemap] Failed to generate dynamic pages:', error);
        return staticPages;
    }
}
