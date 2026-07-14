import { adminDb } from '@/lib/firebase-admin';
import { serializeDocs } from '@/lib/serialize-firestore';
import { Product } from '@/types';
import type { Metadata } from 'next';
import PreorderClient from '@/components/preorder/preorder-client';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: "Pre-Order | Rud'Ark PRO SHOP",
    description: 'Reserve your Glamping Tent, Rafting Boat or Kayak ahead of arrival — pay a small deposit now, settle the balance when it lands.',
};

async function getPreOrderProducts(): Promise<Product[]> {
    try {
        const snapshot = await adminDb
            .collection('products')
            .where('is_pre_order', '==', true)
            .where('is_public', '==', true)
            .get();
        return serializeDocs<Product>(snapshot);
    } catch (error) {
        console.error('Error fetching pre-order products:', error);
        return [];
    }
}

export default async function PreOrderPage() {
    const products = await getPreOrderProducts();

    return <PreorderClient products={products} />;
}
