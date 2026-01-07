import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import ProductForm from '@/components/admin/product-form';

export const dynamic = 'force-dynamic';

async function getProduct(id: string) {
    if (id === 'new') return undefined; // Handle new product creation

    const doc = await adminDb.collection('products').doc(id).get();
    if (!doc.exists) return undefined;

    const data = doc.data();

    // Helper to safely serialize dates
    const formatDate = (date: any) => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        if (typeof date.toDate === 'function') return date.toDate().toISOString();
        return null;
    };

    const serializedData = {
        ...data,
        created_at: formatDate(data.created_at),
        updated_at: formatDate(data.updated_at),
        last_synced: formatDate(data.last_synced)
    };

    return {
        id: doc.id,
        ...serializedData
    } as Product;
}

// Fixed params type for Next.js 15+ / Server Component
export default async function ProductEditorPage({ params }: { params: { id: string } }) {
    // Await params to avoid async access issues in newer Next.js versions
    const { id } = await Promise.resolve(params);
    const product = await getProduct(id);

    return (
        <div>
            <ProductForm initialData={product} />
        </div>
    );
}
