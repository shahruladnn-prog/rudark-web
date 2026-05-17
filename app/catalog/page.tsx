import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCatalogItems } from '@/actions/catalog-actions';
import { getCategories } from '@/actions/category-actions';
import CatalogClient from '@/components/catalog/catalog-client';
import { Category } from '@/types';

export const metadata: Metadata = {
    title: "Product Catalog | Rud'Ark PRO SHOP",
    description: "Browse the full Rud'Ark catalog — retail gear, event merchandise, corporate gifts, and custom printing services.",
    openGraph: {
        title: "Product Catalog | Rud'Ark PRO SHOP",
        description: "Everything we make & customize. Retail, events, and corporate solutions.",
        url: 'https://rudark-web.vercel.app/catalog',
    },
};

export const revalidate = 3600;

export default async function CatalogPage() {
    const [items, categories] = await Promise.all([
        getCatalogItems(),
        getCategories(),
    ]);

    return (
        <Suspense fallback={<div className="min-h-screen bg-rudark-matte pt-32 flex items-center justify-center text-gray-500 font-mono uppercase">Loading catalog…</div>}>
            <CatalogClient items={items} categories={categories as Category[]} />
        </Suspense>
    );
}
