import { adminDb } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serialize-firestore';
import { Product } from '@/types';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Metadata } from 'next';
import PreorderForm from '@/components/preorder/preorder-form';

export const revalidate = 3600;

const getPreOrderProduct = cache(async (sku: string): Promise<Product | null> => {
    try {
        const snapshot = await adminDb
            .collection('products')
            .where('sku', '==', sku)
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        const product = serializeDoc<Product>(snapshot.docs[0]);
        if (!product?.is_pre_order) return null;
        return product;
    } catch (error) {
        console.error('Error fetching pre-order product:', error);
        return null;
    }
});

export async function generateMetadata(
    { params }: { params: Promise<{ sku: string }> }
): Promise<Metadata> {
    const { sku } = await params;
    const product = await getPreOrderProduct(sku);
    if (!product) return { title: "Pre-Order Not Found | Rud'Ark PRO SHOP" };
    return { title: `Pre-Order: ${product.name} | Rud'Ark PRO SHOP` };
}

export default async function PreOrderDetailPage({ params }: { params: Promise<{ sku: string }> }) {
    const { sku } = await params;
    const product = await getPreOrderProduct(sku);

    if (!product) notFound();

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-5xl mx-auto bg-rudark-carbon rounded-sm shadow-xl border border-rudark-grey/30 p-6 md:p-10">
                <PreorderForm product={product} />
            </div>
        </div>
    );
}
