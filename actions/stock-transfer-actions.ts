'use server';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { StockTransfer, TransferItem, TransferStatus } from '@/types/stock-transfer';
import { recordStockMovement } from './stock-movement-actions';

// Constants
const MAX_ITEMS_PER_TRANSFER = 50;
const MAX_TRANSFERS_QUERY = 100;

/**
 * Generate transfer number
 */
function generateTransferNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TRF-${dateStr}-${random}`;
}

/**
 * Create a new stock transfer (PENDING status)
 */
export async function createTransfer(data: {
    from_store_id: string;
    from_store_name: string;
    to_store_id: string;
    to_store_name: string;
    items: TransferItem[];
    notes?: string;
}): Promise<{ success: boolean; transferId?: string; error?: string }> {
    try {
        // Validation
        if (!data.from_store_id || !data.to_store_id) {
            return { success: false, error: 'Source and destination stores are required' };
        }

        if (data.from_store_id === data.to_store_id) {
            return { success: false, error: 'Source and destination cannot be the same' };
        }

        if (!data.items || data.items.length === 0) {
            return { success: false, error: 'At least one item is required' };
        }

        if (data.items.length > MAX_ITEMS_PER_TRANSFER) {
            return { success: false, error: `Maximum ${MAX_ITEMS_PER_TRANSFER} items per transfer` };
        }

        const transfer: Omit<StockTransfer, 'id'> = {
            transfer_number: generateTransferNumber(),
            from_store_id: data.from_store_id,
            from_store_name: data.from_store_name,
            to_store_id: data.to_store_id,
            to_store_name: data.to_store_name,
            status: 'PENDING',
            items: data.items,
            notes: data.notes || '',
            created_at: FieldValue.serverTimestamp()
        };

        const docRef = await adminDb.collection('stock_transfers').add(transfer);

        revalidatePath('/admin/stock/transfer');

        return { success: true, transferId: docRef.id };

    } catch (error: any) {
        console.error('[createTransfer] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve and initiate transfer (deducts from source)
 */
export async function approveTransfer(transferId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('stock_transfers').doc(transferId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Transfer not found' };
        }

        const transfer = doc.data() as StockTransfer;

        if (transfer.status !== 'PENDING') {
            return { success: false, error: `Cannot approve transfer in ${transfer.status} status` };
        }

        // Deduct stock from source store for each item
        for (const item of transfer.items) {
            const result = await recordStockMovement({
                product_id: item.product_id,
                product_name: item.product_name,
                variant_sku: item.variant_sku,
                variant_label: item.variant_label,
                type: 'TRANSFER_OUT',
                quantity: -Math.abs(item.quantity), // Negative for deduction
                previous_quantity: 0, // Will be calculated in recordStockMovement
                new_quantity: 0,
                reason: `Transfer to ${transfer.to_store_name}`,
                reference: transfer.transfer_number,
                store_id: transfer.from_store_id
            });

            if (!result.success) {
                return { success: false, error: `Failed to deduct ${item.product_name}: ${result.error}` };
            }
        }

        // Update transfer status
        await docRef.update({
            status: 'IN_TRANSIT',
            approved_at: FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/stock');
        revalidatePath('/admin/stock/transfer');

        return { success: true };

    } catch (error: any) {
        console.error('[approveTransfer] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Complete transfer (add to destination)
 */
export async function completeTransfer(transferId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('stock_transfers').doc(transferId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Transfer not found' };
        }

        const transfer = doc.data() as StockTransfer;

        if (transfer.status !== 'IN_TRANSIT' && transfer.status !== 'APPROVED') {
            return { success: false, error: `Cannot complete transfer in ${transfer.status} status` };
        }

        // Add stock to destination store for each item
        for (const item of transfer.items) {
            const receivedQty = item.received_quantity ?? item.quantity;

            const result = await recordStockMovement({
                product_id: item.product_id,
                product_name: item.product_name,
                variant_sku: item.variant_sku,
                variant_label: item.variant_label,
                type: 'TRANSFER_IN',
                quantity: Math.abs(receivedQty), // Positive for addition
                previous_quantity: 0,
                new_quantity: 0,
                reason: `Transfer from ${transfer.from_store_name}`,
                reference: transfer.transfer_number,
                store_id: transfer.to_store_id
            });

            if (!result.success) {
                return { success: false, error: `Failed to add ${item.product_name}: ${result.error}` };
            }
        }

        // Update transfer status
        await docRef.update({
            status: 'COMPLETED',
            completed_at: FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/stock');
        revalidatePath('/admin/stock/transfer');

        return { success: true };

    } catch (error: any) {
        console.error('[completeTransfer] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancel transfer (revert if approved)
 */
export async function cancelTransfer(transferId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('stock_transfers').doc(transferId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Transfer not found' };
        }

        const transfer = doc.data() as StockTransfer;

        if (transfer.status === 'COMPLETED') {
            return { success: false, error: 'Cannot cancel completed transfer' };
        }

        // If approved/in-transit, revert the stock deduction
        if (transfer.status === 'IN_TRANSIT' || transfer.status === 'APPROVED') {
            for (const item of transfer.items) {
                await recordStockMovement({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_sku: item.variant_sku,
                    variant_label: item.variant_label,
                    type: 'ADJUST',
                    quantity: Math.abs(item.quantity), // Add back
                    previous_quantity: 0,
                    new_quantity: 0,
                    reason: `Transfer cancelled: ${reason}`,
                    reference: transfer.transfer_number,
                    store_id: transfer.from_store_id
                });
            }
        }

        // Update transfer status
        await docRef.update({
            status: 'CANCELLED',
            cancelled_reason: reason
        });

        revalidatePath('/admin/stock');
        revalidatePath('/admin/stock/transfer');

        return { success: true };

    } catch (error: any) {
        console.error('[cancelTransfer] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get transfers with optional filtering
 */
export async function getTransfers(options: {
    status?: TransferStatus;
    limit?: number;
} = {}): Promise<StockTransfer[]> {
    try {
        const { status, limit = MAX_TRANSFERS_QUERY } = options;

        let query: any = adminDb.collection('stock_transfers')
            .orderBy('created_at', 'desc')
            .limit(limit);

        if (status) {
            query = query.where('status', '==', status);
        }

        const snapshot = await query.get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.().toISOString() || null,
            approved_at: doc.data().approved_at?.toDate?.().toISOString() || null,
            completed_at: doc.data().completed_at?.toDate?.().toISOString() || null
        })) as StockTransfer[];

    } catch (error) {
        console.error('[getTransfers] Error:', error);
        return [];
    }
}

/**
 * Get a single transfer by ID
 */
export async function getTransferById(transferId: string): Promise<StockTransfer | null> {
    try {
        const doc = await adminDb.collection('stock_transfers').doc(transferId).get();

        if (!doc.exists) return null;

        const data = doc.data()!;
        return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.().toISOString() || null,
            approved_at: data.approved_at?.toDate?.().toISOString() || null,
            completed_at: data.completed_at?.toDate?.().toISOString() || null
        } as StockTransfer;

    } catch (error) {
        console.error('[getTransferById] Error:', error);
        return null;
    }
}
