'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface AdminLog {
    id?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details?: Record<string, any>;
    created_by: string;
    created_at?: string;
}

export async function logAdminAction(
    action: string,
    entityType: string,
    entityId: string,
    details?: Record<string, any>
): Promise<void> {
    await requireRole(['owner']);

    try {
        await adminDb.collection('admin_logs').add({
            action,
            entity_type: entityType,
            entity_id: entityId,
            details: details || {},
            created_by: 'admin',
            created_at: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // Non-critical — logging failures must not break business operations
        console.error('[logAdminAction] Failed to write log:', err);
    }
}

export async function getAdminLogs(limit = 100): Promise<AdminLog[]> {
    await requireRole(['owner']);

    try {
        const snapshot = await adminDb
            .collection('admin_logs')
            .orderBy('created_at', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.().toISOString() || null,
        })) as AdminLog[];
    } catch (err) {
        console.error('[getAdminLogs] Error:', err);
        return [];
    }
}
