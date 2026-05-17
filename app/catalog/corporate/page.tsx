import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCatalogItems } from '@/actions/catalog-actions';
import { getCategories } from '@/actions/category-actions';
import CatalogClient from '@/components/catalog/catalog-client';
import { Category } from '@/types';

export const metadata: Metadata = {
    title: "Corporate & Gifts | Rud'Ark Catalog",
    description: "Corporate door gifts, team-building merchandise, printing services, and partnership add-ons.",
};

export const revalidate = 3600;

export default async function CatalogCorporatePage() {
    const [items, categories] = await Promise.all([
        getCatalogItems(),
        getCategories(),
    ]);

    return (
        <Suspense fallback={<div className="min-h-screen bg-rudark-matte pt-32 flex items-center justify-center text-gray-500 font-mono uppercase">Loading…</div>}>
            <CatalogClient
                items={items}
                categories={categories as Category[]}
                initialUse="corporate"
                hideUseCaseTiles
                heroTitle="Corporate & team gifts"
                heroSubtitle="Door gifts, team-building add-ons, and printing services for agencies and corporate partners."
            />
        </Suspense>
    );
}
