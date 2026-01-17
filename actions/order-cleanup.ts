'use server';

import { adminDb } from '@/lib/firebase-admin';

/**
 * Permanently delete orders that are PENDING/FAILED and older than X days.
 * This helps keep the database clean of abandoned checkout sessions.
 */
export async function cleanupStaleOrders(olderThanDays: number = 7) {
    try {
        // Calculate cutoff date
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - olderThanDays);

        console.log(`[Cleanup] Finding stale orders older than ${thresholdDate.toISOString()}...`);

        // We run separate queries to avoid complex 'IN' + Inequality index requirements if possible
        const statuses = ['PENDING', 'PENDING_PAYMENT', 'FAILED'];
        let docsToDelete: FirebaseFirestore.QueryDocumentSnapshot[] = [];

        // For each status, fetch stale items
        // Note: This still requires a composite index on (status, created_at) usually.
        // If it fails, we might need to fallback to client-side filtering (fetch recent pending, etc)
        // usage: .where('status', '==', s).where('created_at', '<', thresholdDate)

        for (const status of statuses) {
            const snapshot = await adminDb.collection('orders')
                .where('status', '==', status)
                .where('created_at', '<', thresholdDate)
                .limit(200) // Safety limit per status
                .get();

            snapshot.docs.forEach(doc => docsToDelete.push(doc as any));
        }

        // Deduplicate
        const uniqueIds = new Set();
        const uniqueDocs = docsToDelete.filter(doc => {
            if (uniqueIds.has(doc.id)) return false;
            uniqueIds.add(doc.id);
            return true;
        });

        if (uniqueDocs.length === 0) {
            return { success: true, count: 0, message: 'No stale orders found to clean up.' };
        }

        // Perform Batch Deletes (Chunked to 400 to be safe, limit is 500)
        // We use Promise.all to execute multiple batches if needed
        const chunkSize = 400;
        const commits = [];

        for (let i = 0; i < uniqueDocs.length; i += chunkSize) {
            const chunk = uniqueDocs.slice(i, i + chunkSize);
            const batch = adminDb.batch();
            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });
            commits.push(batch.commit());
        }

        await Promise.all(commits);

        console.log(`[Cleanup] Deleted ${uniqueDocs.length} stale orders in ${commits.length} batches.`);

        return {
            success: true,
            count: uniqueDocs.length,
            message: `Successfully cleaned up ${uniqueDocs.length} stale orders.`
        };

    } catch (error: any) {
        console.error('[Cleanup] Error:', error);

        // Detailed error for index missing
        if (error.code === 9 || error.message?.includes('index')) {
            return {
                success: false,
                error: 'Missing Firestore Index. Please create composite index for (status ASC, created_at ASC).'
            };
        }

        return { success: false, error: 'Failed to cleanup orders: ' + error.message };
    }
}
