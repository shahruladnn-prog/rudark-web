import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCatalogItems } from '@/actions/catalog-actions';
import { getCategories } from '@/actions/category-actions';
import CatalogClient from '@/components/catalog/catalog-client';
import { Category } from '@/types';

export const metadata: Metadata = {
    title: "Events & Merchandising | Rud'Ark Catalog",
    description: "Custom event merchandise, bulk orders, embroidery, and screen printing for events and festivals.",
};

export const revalidate = 3600;

export default async function CatalogEventsPage() {
    const [items, categories] = await Promise.all([
        getCatalogItems(),
        getCategories(),
    ]);

    return (
        <Suspense fallback={<div className="min-h-screen bg-rudark-matte pt-32 flex items-center justify-center text-gray-500 font-mono uppercase">Loading…</div>}>
            <CatalogClient
                items={items}
                categories={categories as Category[]}
                initialUse="events"
                hideUseCaseTiles
                heroTitle="Events & merchandising"
                heroSubtitle="Bulk custom merch, festival gear, and branded apparel for event companies and organizers."
            />
        </Suspense>
    );
}
