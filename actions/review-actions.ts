'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { Review } from '@/types';
import { revalidatePath } from 'next/cache';
import { serializeDocs } from '@/lib/serialize-firestore';

export async function submitReview(data: {
    product_sku: string;
    customer_name: string;
    customer_email: string;
    rating: number;
    body: string;
}) {
    try {
        const review: Omit<Review, 'id'> = {
            ...data,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        await adminDb.collection('reviews').add(review);
        return { success: true };
    } catch (error) {
        console.error('Error submitting review:', error);
        return { success: false, error: 'Failed to submit review' };
    }
}

export async function getApprovedReviews(sku: string) {
    try {
        const snapshot = await adminDb
            .collection('reviews')
            .where('product_sku', '==', sku)
            .where('status', '==', 'approved')
            .orderBy('created_at', 'desc')
            .get();

        return serializeDocs<Review>(snapshot);
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }
}

export async function getPendingReviews() {
    await requireRole(['owner', 'staff']);

    try {
        const snapshot = await adminDb
            .collection('reviews')
            .where('status', '==', 'pending')
            .orderBy('created_at', 'desc')
            .get();

        return serializeDocs<Review>(snapshot);
    } catch (error) {
        console.error('Error fetching pending reviews:', error);
        return [];
    }
}

export async function moderateReview(id: string, status: 'approved' | 'rejected') {
    await requireRole(['owner', 'staff']);

    try {
        if (status === 'rejected') {
            await adminDb.collection('reviews').doc(id).delete();
        } else {
            await adminDb.collection('reviews').doc(id).update({ status });
        }
        
        revalidatePath('/admin/products/reviews');
        // We might want to revalidate the specific product page too
        // but we don't have the sku here easily unless we fetch the doc first
        const doc = await adminDb.collection('reviews').doc(id).get();
        const sku = doc.data()?.product_sku;
        if (sku) {
            revalidatePath(`/product/${sku}`);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error moderating review:', error);
        return { success: false, error: 'Failed to moderate review' };
    }
}
