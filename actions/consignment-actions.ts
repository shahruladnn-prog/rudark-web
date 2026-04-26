'use server';
import { requireRole } from '@/actions/session-actions';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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
): Promise<{

 success: boolean; consignment_id?: string; error?: string }> {
    await requireRole(['owner', 'staff']);

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
 * Helper to update stock within a transaction and record movement
 */
async function applyStockUpdateTx(
    transaction: any,
    consignmentId: string,
    consignmentNumber: string,
    item: any,
    type: 'TRANSFER_OUT' | 'TRANSFER_IN' | 'DAMAGE',
    quantityChange: number // negative for deduction, positive for addition
) {
    const productRef = adminDb.collection('products').doc(item.product_id);
    const productSnap = await transaction.get(productRef);
    
    if (!productSnap.exists) return;
    
    const product = productSnap.data()!;
    let previousQty = 0;
    let newQty = 0;

    // Handle variant vs parent
    if (item.variant_sku && product.variants && product.variants.length > 0) {
        const vIdx = product.variants.findIndex((v: any) => v.sku === item.variant_sku);
        if (vIdx !== -1) {
            previousQty = product.variants[vIdx].stock_quantity || 0;
            newQty = previousQty + quantityChange;
            
            const updatedVariants = [...product.variants];
            updatedVariants[vIdx] = {
                ...updatedVariants[vIdx],
                stock_quantity: newQty
            };

            const newParentTotal = updatedVariants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
            
            transaction.update(productRef, {
                variants: updatedVariants,
                stock_quantity: newParentTotal,
                updated_at: FieldValue.serverTimestamp()
            });
        }
    } else {
        previousQty = product.stock_quantity || 0;
        newQty = previousQty + quantityChange;
        
        transaction.update(productRef, {
            stock_quantity: newQty,
            updated_at: FieldValue.serverTimestamp()
        });
    }

    // Log the movement
    const movementRef = adminDb.collection('stock_movements').doc();
    transaction.set(movementRef, {
        product_id: item.product_id,
        product_name: item.product_name,
        variant_sku: item.variant_sku,
        variant_label: item.variant_label,
        type: type,
        quantity: quantityChange,
        previous_quantity: previousQty,
        new_quantity: newQty,
        reason: `Consignment ${type.replace('_', ' ').toLowerCase()}: ${consignmentNumber}`,
        reference: consignmentId,
        created_by: 'admin',
        created_at: FieldValue.serverTimestamp()
    });
}

/**
 * Send a consignment to partner (DRAFT -> ACTIVE)
 * This deducts stock from inventory
 */
export async function sendConsignment(consignmentId: string): Promise<{

 success: boolean; error?: string }> {
    await requireRole(['owner', 'staff']);

    try {
        await adminDb.runTransaction(async (transaction) => {
            const docRef = adminDb.collection('consignments').doc(consignmentId);
            const doc = await transaction.get(docRef);

            if (!doc.exists) throw new Error('Consignment not found');
            const consignment = doc.data()!;

            if (consignment.status !== 'DRAFT') {
                throw new Error(`Cannot send consignment with status: ${consignment.status}`);
            }

            // Deduct stock for each item
            for (const item of consignment.items) {
                await applyStockUpdateTx(
                    transaction,
                    consignmentId,
                    consignment.consignment_number,
                    item,
                    'TRANSFER_OUT',
                    -item.quantity_sent
                );
            }

            transaction.update(docRef, {
                status: 'ACTIVE',
                sent_at: new Date(),
                updated_at: new Date()
            });
        });

        console.log(`[Consignment] Sent ${consignmentId}`);

        revalidatePath('/admin/consignments');
        revalidatePath('/admin/stock');

        return { success: true };
    } catch (error: any) {
        console.error('[Consignment] Send error:', error);
        return { success: false, error: error.message || 'Failed to send consignment' };
    }
}

/**
 * Record sales from partner
 */
export async function recordConsignmentSales(
    consignmentId: string,
    salesData: Array<{ product_id: string; variant_sku?: string; quantity_sold: number }>
): Promise<{

 success: boolean; error?: string }> {
    await requireRole(['owner', 'staff']);

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
): Promise<{

 success: boolean; error?: string }> {
    await requireRole(['owner', 'staff']);

    try {
        await adminDb.runTransaction(async (transaction) => {
            const docRef = adminDb.collection('consignments').doc(consignmentId);
            const doc = await transaction.get(docRef);

            if (!doc.exists) throw new Error('Consignment not found');
            const consignment = doc.data()!;

            if (!['ACTIVE', 'RECONCILING'].includes(consignment.status)) {
                throw new Error(`Cannot reconcile consignment with status: ${consignment.status}`);
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

            // Process each return record
            for (const returnRecord of returnData) {
                const item = consignment.items.find((i: ConsignmentItem) =>
                    i.product_id === returnRecord.product_id &&
                    (i.variant_sku || undefined) === (returnRecord.variant_sku || undefined)
                );

                if (!item) continue;

                // Restore stock for returned items
                if (returnRecord.quantity_returned > 0) {
                    await applyStockUpdateTx(
                        transaction,
                        consignmentId,
                        consignment.consignment_number,
                        item,
                        'TRANSFER_IN',
                        returnRecord.quantity_returned
                    );
                }

                // Record lost items as DAMAGE
                if (returnRecord.quantity_lost > 0) {
                    await applyStockUpdateTx(
                        transaction,
                        consignmentId,
                        consignment.consignment_number,
                        item,
                        'DAMAGE',
                        -returnRecord.quantity_lost
                    );
                }
            }

            // Check if fully reconciled
            const newStatus = summary.is_fully_reconciled ? 'CLOSED' : 'RECONCILING';

            transaction.update(docRef, {
                items: updatedItems,
                status: newStatus,
                total_returned_value: summary.total_returned_value,
                total_lost_value: summary.total_lost_value,
                reconciled_at: new Date(),
                closed_at: newStatus === 'CLOSED' ? new Date() : null,
                updated_at: new Date()
            });
        });

        revalidatePath('/admin/consignments');
        revalidatePath(`/admin/consignments/${consignmentId}`);
        revalidatePath('/admin/stock');

        return { success: true };
    } catch (error: any) {
        console.error('[Consignment] Reconcile error:', error);
        return { success: false, error: error.message || 'Failed to reconcile consignment' };
    }
}

/**
 * Close a consignment manually
 */
export async function closeConsignment(consignmentId: string): Promise<{

 success: boolean; error?: string }> {
    await requireRole(['owner', 'staff']);

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
export async function cancelConsignment(consignmentId: string): Promise<{

 success: boolean; error?: string }> {
    await requireRole(['owner', 'staff']);

    try {
        await adminDb.runTransaction(async (transaction) => {
            const docRef = adminDb.collection('consignments').doc(consignmentId);
            const doc = await transaction.get(docRef);

            if (!doc.exists) throw new Error('Consignment not found');
            const consignment = doc.data()!;

            // If it was active, restore the stock
            if (consignment.status === 'ACTIVE' || consignment.status === 'RECONCILING') {
                for (const item of consignment.items) {
                    // Calculate how much is still out (not yet accounted for)
                    const stillOut = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;

                    if (stillOut > 0) {
                        await applyStockUpdateTx(
                            transaction,
                            consignmentId,
                            consignment.consignment_number,
                            item,
                            'TRANSFER_IN',
                            stillOut
                        );
                    }
                }
            }

            transaction.update(docRef, {
                status: 'CANCELLED',
                updated_at: new Date()
            });
        });

        console.log(`[Consignment] Cancelled ${consignmentId}`);

        revalidatePath('/admin/consignments');
        revalidatePath('/admin/stock');

        return { success: true };
    } catch (error: any) {
        console.error('[Consignment] Cancel error:', error);
        return { success: false, error: error.message || 'Failed to cancel consignment' };
    }
}

/**
 * Get all consignments
 */
export async function getConsignments(status?: ConsignmentStatus): Promise<Consignment[]> {
    await requireRole(['owner', 'staff']);

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
    await requireRole(['owner', 'staff']);

    try {
        const doc = await adminDb.collection('consignments').doc(consignmentId).get();

        if (!doc.exists) return null;

        return serializeConsignment(doc);
    } catch (error) {
        console.error('[Consignment] Get error:', error);
        return null;
    }
}
