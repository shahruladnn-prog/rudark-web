'use server';

import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { serializeFirestoreData } from '@/lib/serialize-firestore';
import { entryToCatalogItem, isProductInCatalog, productToCatalogItem } from '@/lib/catalog-utils';
import { CatalogEntry, CatalogItem, Product } from '@/types';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';
import { requireRole } from '@/actions/session-actions';

function mapProductDoc(doc: QueryDocumentSnapshot): (Product & { id: string }) | null {
    const data = doc.data() as Product;
    const product = { ...data, id: doc.id } as Product & { id: string };
    if (!isProductInCatalog(product)) return null;
    return product;
}

export async function getCatalogItems(): Promise<CatalogItem[]> {
    try {
        const [productsSnap, entriesSnap] = await Promise.all([
            adminDb.collection('products').orderBy('created_at', 'desc').limit(500).get(),
            adminDb.collection('catalog_entries').where('is_active', '==', true).get().catch(() => null),
        ]);

        const products = productsSnap.docs
            .map(mapProductDoc)
            .filter((p): p is Product & { id: string } => p !== null)
            .map(productToCatalogItem);

        const entries = entriesSnap
            ? entriesSnap.docs.map(doc => entryToCatalogItem({ ...(doc.data() as CatalogEntry), id: doc.id }))
            : [];

        const combined = [...products, ...entries];
        combined.sort((a, b) => {
            if (a.catalog_featured && !b.catalog_featured) return -1;
            if (!a.catalog_featured && b.catalog_featured) return 1;
            const sortA = a.catalog_sort ?? 9999;
            const sortB = b.catalog_sort ?? 9999;
            if (sortA !== sortB) return sortA - sortB;
            return a.name.localeCompare(b.name);
        });

        return serializeFirestoreData(combined) as CatalogItem[];
    } catch (error) {
        console.error('[getCatalogItems] Error:', error);
        return [];
    }
}

export async function getCatalogItemsBySkus(skus: string[]): Promise<CatalogItem[]> {
    if (!skus.length) return [];
    const unique = [...new Set(skus.map(s => s.trim()).filter(Boolean))];
    const all = await getCatalogItems();
    return unique
        .map(sku => all.find(item => item.sku === sku))
        .filter((item): item is CatalogItem => !!item);
}

export async function getCatalogEntries() {
    await requireRole(['owner', 'staff']);
    try {
        const snap = await adminDb.collection('catalog_entries').orderBy('catalog_sort', 'asc').get();
        return snap.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data()),
        }));
    } catch {
        const snap = await adminDb.collection('catalog_entries').get();
        return snap.docs.map(doc => ({
            id: doc.id,
            ...serializeFirestoreData(doc.data()),
        }));
    }
}

export async function getCatalogEntry(id: string) {
    await requireRole(['owner', 'staff']);
    const doc = await adminDb.collection('catalog_entries').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...serializeFirestoreData(doc.data()) };
}

export async function saveCatalogEntry(data: Partial<CatalogEntry>) {
    await requireRole(['owner', 'staff']);

    try {
        const { id, ...rest } = data;
        const payload = {
            ...rest,
            slug: rest.slug || `service-${Date.now()}`,
            is_active: rest.is_active !== false,
            purchase_mode: rest.purchase_mode || 'inquire',
            price_display: rest.price_display || 'quote',
            updated_at: FieldValue.serverTimestamp(),
        };

        if (id) {
            await adminDb.collection('catalog_entries').doc(id).update(payload);
        } else {
            await adminDb.collection('catalog_entries').add({
                ...payload,
                created_at: FieldValue.serverTimestamp(),
            });
        }

        revalidatePath('/catalog');
        revalidatePath('/admin/catalog-entries');
        return { success: true };
    } catch (error: unknown) {
        console.error('[saveCatalogEntry]', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to save' };
    }
}

export async function deleteCatalogEntry(id: string) {
    await requireRole(['owner', 'staff']);
    try {
        await adminDb.collection('catalog_entries').doc(id).delete();
        revalidatePath('/catalog');
        revalidatePath('/admin/catalog-entries');
        return { success: true };
    } catch (error: unknown) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to delete' };
    }
}
