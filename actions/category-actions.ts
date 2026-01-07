'use server';

import { adminDb } from '@/lib/firebase-admin';
import { revalidatePath, revalidateTag } from 'next/cache';

import { unstable_cache } from 'next/cache';

export const getCategories = unstable_cache(
    async () => {
        try {
            const snapshot = await adminDb.collection('categories').orderBy('order', 'asc').get();
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
                    created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
                };
            });
        } catch (error) {
            console.error('Fetch categories error:', error);
            return [];
        }
    },
    ['categories-list-fixed'],
    { tags: ['categories-fixed'] }
);

export async function getCategory(id: string) {
    try {
        const doc = await adminDb.collection('categories').doc(id).get();
        if (!doc.exists) return null;
        const data = doc.data()!;
        return {
            id: doc.id,
            ...data,
            updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at || null,
            created_at: data.created_at?.toDate?.().toISOString() || data.created_at || null,
        };
    } catch (error) {
        return null;
    }
}

export async function saveCategory(data: any) {
    try {
        const { id, ...payload } = data;

        // Auto-generate slug if missing
        if (!payload.slug && payload.name) {
            payload.slug = payload.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        }

        if (id && id !== 'new') {
            await adminDb.collection('categories').doc(id).update(payload);
        } else {
            // Get max order for auto-sort
            const last = await adminDb.collection('categories').orderBy('order', 'desc').limit(1).get();
            const order = !last.empty ? (last.docs[0].data().order || 0) + 1 : 0;

            await adminDb.collection('categories').add({ ...payload, order });
        }

        revalidateTag('categories-fixed');
        revalidatePath('/admin/categories');
        return { success: true };
    } catch (error: any) {
        console.error('Save category error:', error);
        return { success: false, error: error.message || 'Failed to save' };
    }
}

export async function deleteCategory(id: string) {
    try {
        await adminDb.collection('categories').doc(id).delete();
        revalidateTag('categories-fixed');
        revalidatePath('/admin/categories');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete' };
    }
}
