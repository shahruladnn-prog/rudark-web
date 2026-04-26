'use server';
import { requireAdmin, requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { AdminRole, AdminUser } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getAdminRole(uid: string): Promise<AdminRole | null> {
    try {
        await requireAdmin();
    } catch {
        return null;
    }

    try {
        const doc = await adminDb.collection('admin_users').doc(uid).get();
        if (!doc.exists) return null;
        return doc.data()?.role as AdminRole;
    } catch (error) {
        console.error('[getAdminRole] Error:', error);
        return null;
    }
}

export async function getAdminUsers(): Promise<AdminUser[]> {
    await requireRole(['owner']);

    try {
        const snapshot = await adminDb.collection('admin_users').orderBy('created_at', 'desc').get();
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            uid: doc.id
        } as AdminUser));
    } catch (error) {
        console.error('[getAdminUsers] Error:', error);
        return [];
    }
}

export async function addAdminUser(data: { uid: string; email: string; role: AdminRole }) {
    await requireRole(['owner']);

    try {
        await adminDb.collection('admin_users').doc(data.uid).set({
            email: data.email,
            role: data.role,
            created_at: new Date().toISOString()
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('[addAdminUser] Error:', error);
        return { success: false, error: 'Failed to add admin user' };
    }
}

export async function removeAdminUser(uid: string) {
    await requireRole(['owner']);

    try {
        await adminDb.collection('admin_users').doc(uid).delete();
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('[removeAdminUser] Error:', error);
        return { success: false, error: 'Failed to remove admin user' };
    }
}
