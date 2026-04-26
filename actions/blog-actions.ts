'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { serializeFirestoreData } from '@/lib/serialize-firestore';
import { BlogPost } from '@/types';

export async function getPosts(publishedOnly: boolean = false) {
    let query = adminDb.collection('posts').orderBy('created_at', 'desc');

    if (publishedOnly) {
        query = query.where('published', '==', true) as any;
    }

    const snapshot = await query.select('slug', 'title', 'excerpt', 'cover_image', 'tags', 'published', 'created_at', 'updated_at').get();
    return snapshot.docs.map(doc => serializeFirestoreData({ id: doc.id, ...doc.data() })) as BlogPost[];
}

export async function getPostBySlug(slug: string) {
    const snapshot = await adminDb.collection('posts').where('slug', '==', slug).limit(1).get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    return serializeFirestoreData({ id: doc.id, ...doc.data() }) as BlogPost;
}

export async function getPostById(id: string) {
    const doc = await adminDb.collection('posts').doc(id).get();

    if (!doc.exists) {
        return null;
    }

    return serializeFirestoreData({ id: doc.id, ...doc.data() }) as BlogPost;
}

export async function createPost(data: Partial<BlogPost>) {
    await requireRole(['owner', 'staff']);

    const docRef = await adminDb.collection('posts').add({
        ...data,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath('/blog');
    revalidatePath('/admin/blog');
    return docRef.id;
}

export async function updatePost(id: string, data: Partial<BlogPost>) {
    await requireRole(['owner', 'staff']);

    await adminDb.collection('posts').doc(id).update({
        ...data,
        updated_at: FieldValue.serverTimestamp(),
    });

    revalidatePath('/blog');
    revalidatePath(`/blog/${data.slug}`);
    revalidatePath('/admin/blog');
    revalidatePath(`/admin/blog/${id}/edit`);
}

export async function deletePost(id: string) {
    await requireRole(['owner', 'staff']);

    await adminDb.collection('posts').doc(id).delete();

    revalidatePath('/blog');
    revalidatePath('/admin/blog');
}
