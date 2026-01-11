import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import ProductForm from '@/components/admin/product-form';
import { serializeDoc } from '@/lib/serialize-firestore';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getProduct(id: string) {
    if (id === 'new') return undefined; // Handle new product creation

    try {
        const doc = await adminDb.collection('products').doc(id).get();

        if (!doc.exists) {
            return null;
        }

        return serializeDoc<Product>(doc);
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

import { getCategories } from '@/actions/category-actions';

// Fixed params type for Next.js 15+ / Server Component
export default async function ProductEditorPage({ params }: { params: { id: string } }) {
    // Await params to avoid async access issues in newer Next.js versions
    const { id } = await Promise.resolve(params);
    const product = await getProduct(id);
    const categories = await getCategories(); // FETCH REAL CATEGORIES

    return (
        <div>
            <ProductForm initialData={product} categories={categories} />
        </div>
    );
}
