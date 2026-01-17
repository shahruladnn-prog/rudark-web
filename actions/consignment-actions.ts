'use server';

import { adminDb } from '@/lib/firebase-admin';
import { recordStockMovement } from './stock-movement-actions';
import { revalidatePath } from 'next/cache';
import {
    Consignment,
    ConsignmentItem,
    ConsignmentPartner,
    ConsignmentStatus,
    calculateConsignmentSummary
} from '@/types/consignment';

/**
 * Generate a unique consignment number
 */
async function generateConsignmentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CON-${year}-`;

    // Get the count of consignments this year
    const snapshot = await adminDb.collection('consignments')
        .where('consignment_number', '>=', prefix)
        .where('consignment_number', '<', prefix + '\uf8ff')
        .get();

    const nextNum = (snapshot.size + 1).toString().padStart(3, '0');
    return `${prefix}${nextNum}`;
}

/**
 * Helper to serialize Firestore timestamps
 */
function serializeConsignment(doc: any): Consignment {
    const data = doc.data();
    return {
        id: doc.id,
        consignment_number: data.consignment_number,
        partner: data.partner,
        status: data.status,
        items: data.items || [],
        created_at: data.created_at?.toDate?.().toISOString() || data.created_at,
        sent_at: data.sent_at?.toDate?.().toISOString() || data.sent_at,
        expected_return_date: data.expected_return_date?.toDate?.().toISOString() || data.expected_return_date,
        reconciled_at: data.reconciled_at?.toDate?.().toISOString() || data.reconciled_at,
        closed_at: data.closed_at?.toDate?.().toISOString() || data.closed_at,
        total_sent_value: data.total_sent_value || 0,
        total_sold_value: data.total_sold_value || 0,
        total_returned_value: data.total_returned_value || 0,
        total_lost_value: data.total_lost_value || 0,
        commission_rate: data.commission_rate,
        notes: data.notes,
        created_by: data.created_by,
        updated_at: data.updated_at?.toDate?.().toISOString() || data.updated_at
    };
}

/**
 * Create a new consignment (DRAFT status)
 */
export async function createConsignment(
    partner: ConsignmentPartner,
    items: Omit<ConsignmentItem, 'quantity_sold' | 'quantity_returned' | 'quantity_lost'>[],
    options?: {
        expected_return_date?: string;
        commission_rate?: number;
        notes?: string;
    }
): Promise<{ success: boolean; consignment_id?: string; error?: string }> {
    try {
        const consignmentNumber = await generateConsignmentNumber();

        // Initialize items with zero sold/returned/lost
        const fullItems: ConsignmentItem[] = items.map(item => ({
            ...item,
            quantity_sold: 0,
            quantity_returned: 0,
            quantity_lost: 0
        }));

        const summary = calculateConsignmentSummary(fullItems);

        const consignmentData = {
            consignment_number: consignmentNumber,
            partner,
            status: 'DRAFT' as ConsignmentStatus,
            items: fullItems,
            created_at: new Date(),
            expected_return_date: options?.expected_return_date ? new Date(options.expected_return_date) : null,
            total_sent_value: summary.total_sent_value,
            total_sold_value: 0,
            total_returned_value: 0,
            total_lost_value: 0,
            commission_rate: options?.commission_rate,
            notes: options?.notes,
            created_by: 'admin',
            updated_at: new Date()
        };

        const docRef = await adminDb.collection('consignments').add(consignmentData);

        console.log(`[Consignment] Created ${consignmentNumber} with ${items.length} items`);

        revalidatePath('/admin/consignments');

        return { success: true, consignment_id: docRef.id };
    } catch (error) {
        console.error('[Consignment] Create error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create consignment' };
    }
}

/**
 * Send a consignment to partner (DRAFT -> ACTIVE)
 * This deducts stock from inventory
 */
export async function sendConsignment(consignmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('consignments').doc(consignmentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Consignment not found' };
        }

        const consignment = doc.data()!;

        if (consignment.status !== 'DRAFT') {
            return { success: false, error: `Cannot send consignment with status: ${consignment.status}` };
        }

        // Deduct stock for each item
        for (const item of consignment.items) {
            await recordStockMovement({
                product_id: item.product_id,
                product_name: item.product_name,
                variant_sku: item.variant_sku,
                variant_label: item.variant_label,
                type: 'TRANSFER_OUT',
                quantity: -item.quantity_sent,
                previous_quantity: 0, // Will be calculated
                new_quantity: 0,
                reason: `Consignment: ${consignment.consignment_number}`,
                reference: consignmentId,
                created_by: 'admin'
            });
        }

        await docRef.update({
            status: 'ACTIVE',
            sent_at: new Date(),
            updated_at: new Date()
        });

        console.log(`[Consignment] Sent ${consignment.consignment_number}`);

        revalidatePath('/admin/consignments');
        revalidatePath('/admin/stock');

        return { success: true };
    } catch (error) {
        console.error('[Consignment] Send error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to send consignment' };
    }
}

/**
 * Record sales from partner
 */
export async function recordConsignmentSales(
    consignmentId: string,
    salesData: Array<{ product_id: string; variant_sku?: string; quantity_sold: number }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('consignments').doc(consignmentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Consignment not found' };
        }

        const consignment = doc.data()!;

        if (consignment.status !== 'ACTIVE') {
            return { success: false, error: `Cannot record sales for status: ${consignment.status}` };
        }

        // Update items with sales data
        const updatedItems = consignment.items.map((item: ConsignmentItem) => {
            const saleRecord = salesData.find(s =>
                s.product_id === item.product_id &&
                (s.variant_sku || undefined) === (item.variant_sku || undefined)
            );

            if (saleRecord) {
                return {
                    ...item,
                    quantity_sold: item.quantity_sold + saleRecord.quantity_sold
                };
            }
            return item;
        });

        const summary = calculateConsignmentSummary(updatedItems);

        await docRef.update({
            items: updatedItems,
            total_sold_value: summary.total_sold_value,
            updated_at: new Date()
        });

        console.log(`[Consignment] Recorded sales for ${consignment.consignment_number}`);

        revalidatePath('/admin/consignments');
        revalidatePath(`/admin/consignments/${consignmentId}`);

        return { success: true };
    } catch (error) {
        console.error('[Consignment] Record sales error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to record sales' };
    }
}

/**
 * Reconcile returns from partner (record returned/lost items)
 */
export async function reconcileConsignment(
    consignmentId: string,
    returnData: Array<{
        product_id: string;
        variant_sku?: string;
        quantity_returned: number;
        quantity_lost: number
    }>
): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('consignments').doc(consignmentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Consignment not found' };
        }

        const consignment = doc.data()!;

        if (!['ACTIVE', 'RECONCILING'].includes(consignment.status)) {
            return { success: false, error: `Cannot reconcile consignment with status: ${consignment.status}` };
        }

        // Update items with return data
        const updatedItems = consignment.items.map((item: ConsignmentItem) => {
            const returnRecord = returnData.find(r =>
                r.product_id === item.product_id &&
                (r.variant_sku || undefined) === (item.variant_sku || undefined)
            );

            if (returnRecord) {
                return {
                    ...item,
                    quantity_returned: item.quantity_returned + returnRecord.quantity_returned,
                    quantity_lost: item.quantity_lost + returnRecord.quantity_lost
                };
            }
            return item;
        });

        const summary = calculateConsignmentSummary(updatedItems);

        // Restore stock for returned items
        for (const returnRecord of returnData) {
            if (returnRecord.quantity_returned > 0) {
                const item = consignment.items.find((i: ConsignmentItem) =>
                    i.product_id === returnRecord.product_id &&
                    (i.variant_sku || undefined) === (returnRecord.variant_sku || undefined)
                );

                if (item) {
                    await recordStockMovement({
                        product_id: item.product_id,
                        product_name: item.product_name,
                        variant_sku: item.variant_sku,
                        variant_label: item.variant_label,
                        type: 'TRANSFER_IN',
                        quantity: returnRecord.quantity_returned,
                        previous_quantity: 0,
                        new_quantity: 0,
                        reason: `Consignment return: ${consignment.consignment_number}`,
                        reference: consignmentId,
                        created_by: 'admin'
                    });
                }
            }

            // Record lost items as DAMAGE
            if (returnRecord.quantity_lost > 0) {
                const item = consignment.items.find((i: ConsignmentItem) =>
                    i.product_id === returnRecord.product_id &&
                    (i.variant_sku || undefined) === (returnRecord.variant_sku || undefined)
                );

                if (item) {
                    await recordStockMovement({
                        product_id: item.product_id,
                        product_name: item.product_name,
                        variant_sku: item.variant_sku,
                        variant_label: item.variant_label,
                        type: 'DAMAGE',
                        quantity: -returnRecord.quantity_lost,
                        previous_quantity: 0,
                        new_quantity: 0,
                        reason: `Consignment loss: ${consignment.consignment_number}`,
                        reference: consignmentId,
                        created_by: 'admin'
                    });
                }
            }
        }

        // Check if fully reconciled
        const newStatus = summary.is_fully_reconciled ? 'CLOSED' : 'RECONCILING';

        await docRef.update({
            items: updatedItems,
            status: newStatus,
            total_returned_value: summary.total_returned_value,
            total_lost_value: summary.total_lost_value,
            reconciled_at: new Date(),
            closed_at: newStatus === 'CLOSED' ? new Date() : null,
            updated_at: new Date()
        });

        console.log(`[Consignment] Reconciled ${consignment.consignment_number}, status: ${newStatus}`);

        revalidatePath('/admin/consignments');
        revalidatePath(`/admin/consignments/${consignmentId}`);
        revalidatePath('/admin/stock');

        return { success: true };
    } catch (error) {
        console.error('[Consignment] Reconcile error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to reconcile consignment' };
    }
}

/**
 * Close a consignment manually
 */
export async function closeConsignment(consignmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('consignments').doc(consignmentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Consignment not found' };
        }

        await docRef.update({
            status: 'CLOSED',
            closed_at: new Date(),
            updated_at: new Date()
        });

        revalidatePath('/admin/consignments');

        return { success: true };
    } catch (error) {
        console.error('[Consignment] Close error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to close consignment' };
    }
}

/**
 * Cancel a consignment (restore stock if already sent)
 */
export async function cancelConsignment(consignmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('consignments').doc(consignmentId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Consignment not found' };
        }

        const consignment = doc.data()!;

        // If it was active, restore the stock
        if (consignment.status === 'ACTIVE' || consignment.status === 'RECONCILING') {
            for (const item of consignment.items) {
                // Calculate how much is still out (not yet accounted for)
                const stillOut = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;

                if (stillOut > 0) {
                    await recordStockMovement({
                        product_id: item.product_id,
                        product_name: item.product_name,
                        variant_sku: item.variant_sku,
                        variant_label: item.variant_label,
                        type: 'TRANSFER_IN',
                        quantity: stillOut,
                        previous_quantity: 0,
                        new_quantity: 0,
                        reason: `Consignment cancelled: ${consignment.consignment_number}`,
                        reference: consignmentId,
                        created_by: 'admin'
                    });
                }
            }
        }

        await docRef.update({
            status: 'CANCELLED',
            updated_at: new Date()
        });

        console.log(`[Consignment] Cancelled ${consignment.consignment_number}`);

        revalidatePath('/admin/consignments');
        revalidatePath('/admin/stock');

        return { success: true };
    } catch (error) {
        console.error('[Consignment] Cancel error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel consignment' };
    }
}

/**
 * Get all consignments
 */
export async function getConsignments(status?: ConsignmentStatus): Promise<Consignment[]> {
    try {
        let query: any = adminDb.collection('consignments').orderBy('created_at', 'desc');

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.limit(100).get();

        return snapshot.docs.map(serializeConsignment);
    } catch (error) {
        console.error('[Consignment] Get all error:', error);
        return [];
    }
}

/**
 * Get a single consignment by ID
 */
export async function getConsignment(consignmentId: string): Promise<Consignment | null> {
    try {
        const doc = await adminDb.collection('consignments').doc(consignmentId).get();

        if (!doc.exists) return null;

        return serializeConsignment(doc);
    } catch (error) {
        console.error('[Consignment] Get error:', error);
        return null;
    }
}
