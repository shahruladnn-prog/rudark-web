'use server';

import { adminDb } from '@/lib/firebase-admin';
import { serializeDocs } from '@/lib/serialize-firestore';

/**
 * Get all self-collection orders
 */
export async function getCollectionOrders(status?: string) {
    try {
        let query = adminDb
            .collection('orders')
            .where('delivery_method', '==', 'self_collection')
            .orderBy('created_at', 'desc');

        if (status && status !== 'all') {
            query = query.where('shipping_status', '==', status);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        return serializeDocs(snapshot);
    } catch (error) {
        console.error('Error fetching collection orders:', error);
        return [];
    }
}

/**
 * Mark an order as collected
 */
export async function markAsCollected(orderId: string) {
    try {
        await adminDb.collection('orders').doc(orderId).update({
            shipping_status: 'COLLECTED',
            collected_at: new Date(),
            updated_at: new Date()
        });

        return { success: true };
    } catch (error) {
        console.error('Error marking order as collected:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats() {
    try {
        const snapshot = await adminDb
            .collection('orders')
            .where('delivery_method', '==', 'self_collection')
            .get();

        const orders = snapshot.docs.map(doc => doc.data());

        const stats = {
            total: orders.length,
            ready: orders.filter(o => o.shipping_status === 'READY_FOR_COLLECTION').length,
            collected: orders.filter(o => o.shipping_status === 'COLLECTED').length,
            totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        };

        return stats;
    } catch (error) {
        console.error('Error fetching collection stats:', error);
        return {
            total: 0,
            ready: 0,
            collected: 0,
            totalRevenue: 0
        };
    }
}
