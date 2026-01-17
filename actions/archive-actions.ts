'use server';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Archive Management Actions
 * 
 * Handles archiving old stock movements while keeping them accessible
 * for viewing and downloading.
 */

export interface ArchivedMovement {
    id: string;
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    type: string;
    quantity: number;
    previous_quantity: number;
    new_quantity: number;
    reason?: string;
    reference?: string;
    store_id?: string;
    created_by?: string;
    created_at: string;
    archived_at?: string;
}

/**
 * Get archive statistics
 */
export async function getArchiveStats() {
    try {
        const [activeSnapshot, archiveSnapshot] = await Promise.all([
            adminDb.collection('stock_movements').limit(1).get(),
            adminDb.collection('stock_movements_archive').limit(1).get()
        ]);

        // Count documents (approximate for large collections)
        const activeCount = await adminDb.collection('stock_movements').count().get();
        const archiveCount = await adminDb.collection('stock_movements_archive').count().get();

        return {
            activeCount: activeCount.data().count || 0,
            archiveCount: archiveCount.data().count || 0
        };
    } catch (error) {
        console.error('[getArchiveStats] Error:', error);
        return { activeCount: 0, archiveCount: 0 };
    }
}

/**
 * Get old movements that can be archived (older than 1 year)
 */
export async function getArchivableMovements() {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const snapshot = await adminDb.collection('stock_movements')
            .where('created_at', '<', oneYearAgo)
            .orderBy('created_at', 'asc')
            .limit(100)
            .get();

        return {
            count: snapshot.size,
            oldestDate: snapshot.docs[0]?.data().created_at?.toDate?.()?.toISOString() || null
        };
    } catch (error) {
        console.error('[getArchivableMovements] Error:', error);
        return { count: 0, oldestDate: null };
    }
}

/**
 * Archive old stock movements (1 year or older)
 * Moves to stock_movements_archive collection, does NOT delete permanently
 */
export async function archiveOldMovements(batchSize: number = 100): Promise<{ success: boolean; archived: number; error?: string }> {
    try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const snapshot = await adminDb.collection('stock_movements')
            .where('created_at', '<', oneYearAgo)
            .orderBy('created_at', 'asc')
            .limit(batchSize)
            .get();

        if (snapshot.empty) {
            return { success: true, archived: 0 };
        }

        const batch = adminDb.batch();
        let archivedCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Copy to archive with timestamp
            const archiveRef = adminDb.collection('stock_movements_archive').doc(doc.id);
            batch.set(archiveRef, {
                ...data,
                archived_at: FieldValue.serverTimestamp()
            });

            // Remove from active collection
            batch.delete(doc.ref);
            archivedCount++;
        }

        await batch.commit();

        revalidatePath('/admin/stock');

        return { success: true, archived: archivedCount };

    } catch (error: any) {
        console.error('[archiveOldMovements] Error:', error);
        return { success: false, archived: 0, error: error.message };
    }
}

/**
 * Get archived movements (for viewing)
 */
export async function getArchivedMovements(options: {
    limit?: number;
    startAfter?: string;
    productId?: string;
} = {}): Promise<ArchivedMovement[]> {
    try {
        const { limit = 100, productId } = options;

        let query: any = adminDb.collection('stock_movements_archive')
            .orderBy('created_at', 'desc')
            .limit(limit);

        if (productId) {
            query = query.where('product_id', '==', productId);
        }

        const snapshot = await query.get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.().toISOString() || null,
            archived_at: doc.data().archived_at?.toDate?.().toISOString() || null
        })) as ArchivedMovement[];

    } catch (error) {
        console.error('[getArchivedMovements] Error:', error);
        return [];
    }
}

/**
 * Export archived movements as JSON (for download)
 */
export async function exportArchivedMovements(options: {
    dateFrom?: string;
    dateTo?: string;
    productId?: string;
} = {}): Promise<{ success: boolean; data?: ArchivedMovement[]; count?: number; error?: string }> {
    try {
        const { dateFrom, dateTo, productId } = options;

        let query: any = adminDb.collection('stock_movements_archive')
            .orderBy('created_at', 'desc')
            .limit(1000); // Max export limit

        if (productId) {
            query = query.where('product_id', '==', productId);
        }

        const snapshot = await query.get();

        let movements: ArchivedMovement[] = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.().toISOString() || null,
            archived_at: doc.data().archived_at?.toDate?.().toISOString() || null
        }));

        // Client-side date filtering for simplicity
        if (dateFrom) {
            const from = new Date(dateFrom);
            movements = movements.filter(m => new Date(m.created_at) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            movements = movements.filter(m => new Date(m.created_at) <= to);
        }

        return { success: true, data: movements, count: movements.length };

    } catch (error: any) {
        console.error('[exportArchivedMovements] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Restore a specific archived movement back to active
 */
export async function restoreArchivedMovement(movementId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const archiveRef = adminDb.collection('stock_movements_archive').doc(movementId);
        const doc = await archiveRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Archived movement not found' };
        }

        const data = doc.data()!;

        // Remove archived_at field and move back
        const { archived_at, ...restoreData } = data;

        const batch = adminDb.batch();
        batch.set(adminDb.collection('stock_movements').doc(movementId), restoreData);
        batch.delete(archiveRef);
        await batch.commit();

        return { success: true };

    } catch (error: any) {
        console.error('[restoreArchivedMovement] Error:', error);
        return { success: false, error: error.message };
    }
}
