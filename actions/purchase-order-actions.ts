'use server';

import { requireRole } from '@/actions/session-actions';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { recordBulkStockMovements } from '@/actions/stock-movement-actions';

export type POStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface POItem {
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    ordered_qty: number;
    received_qty: number;
}

export interface PurchaseOrder {
    id?: string;
    reference: string;
    supplier_name: string;
    status: POStatus;
    expected_date?: string;
    notes?: string;
    items: POItem[];
    created_at?: any;
    updated_at?: any;
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
    await requireRole(['owner', 'staff', 'warehouse']);
    try {
        const snap = await adminDb.collection('purchase_orders')
            .orderBy('created_at', 'desc')
            .limit(100)
            .get();
        return snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            created_at: doc.data().created_at?.toDate?.().toISOString() || null,
            updated_at: doc.data().updated_at?.toDate?.().toISOString() || null,
        })) as PurchaseOrder[];
    } catch {
        return [];
    }
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    await requireRole(['owner', 'staff', 'warehouse']);
    try {
        const doc = await adminDb.collection('purchase_orders').doc(id).get();
        if (!doc.exists) return null;
        const data = doc.data()!;
        return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.().toISOString() || null,
            updated_at: data.updated_at?.toDate?.().toISOString() || null,
        } as PurchaseOrder;
    } catch {
        return null;
    }
}

export async function createPurchaseOrder(data: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    await requireRole(['owner', 'staff']);
    try {
        const ref = await adminDb.collection('purchase_orders').add({
            ...data,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
        });
        revalidatePath('/admin/stock/purchase-orders');
        return { success: true, id: ref.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updatePurchaseOrderStatus(id: string, status: POStatus): Promise<{ success: boolean; error?: string }> {
    await requireRole(['owner', 'staff', 'warehouse']);
    try {
        await adminDb.collection('purchase_orders').doc(id).update({
            status,
            updated_at: FieldValue.serverTimestamp(),
        });
        revalidatePath('/admin/stock/purchase-orders');
        revalidatePath(`/admin/stock/purchase-orders/${id}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Receive items against a PO. Updates PO received_qty and triggers stock movement.
 * receiveData: array of { item_index, qty_receiving }
 */
export async function receivePurchaseOrderItems(
    poId: string,
    receiveData: Array<{ item_index: number; qty_receiving: number }>
): Promise<{ success: boolean; error?: string }> {
    await requireRole(['owner', 'staff', 'warehouse']);
    try {
        const poDoc = await adminDb.collection('purchase_orders').doc(poId).get();
        if (!poDoc.exists) return { success: false, error: 'PO not found' };

        const po = poDoc.data() as PurchaseOrder;
        const updatedItems = [...po.items];

        // Build bulk stock movement rows
        const stockRows = receiveData
            .filter(r => r.qty_receiving > 0)
            .map(r => {
                const item = po.items[r.item_index];
                updatedItems[r.item_index] = {
                    ...item,
                    received_qty: (item.received_qty || 0) + r.qty_receiving,
                };
                return {
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_sku: item.variant_sku,
                    variant_label: item.variant_label,
                    qty: r.qty_receiving,
                    current_stock: 0, // delta mode doesn't need this
                    mode: 'delta' as const,
                    type: 'RECEIVE' as const,
                };
            });

        if (stockRows.length === 0) return { success: false, error: 'No quantities to receive' };

        // Apply stock movements
        const bulkResult = await recordBulkStockMovements(
            stockRows,
            po.reference,
            `PO Receive: ${po.reference}`
        );

        // Determine new PO status
        const allReceived = updatedItems.every(item => (item.received_qty || 0) >= item.ordered_qty);
        const anyReceived = updatedItems.some(item => (item.received_qty || 0) > 0);
        const newStatus: POStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;

        await adminDb.collection('purchase_orders').doc(poId).update({
            items: updatedItems,
            status: newStatus,
            updated_at: FieldValue.serverTimestamp(),
        });

        revalidatePath('/admin/stock/purchase-orders');
        revalidatePath(`/admin/stock/purchase-orders/${poId}`);

        if (!bulkResult.success && bulkResult.errors.length > 0) {
            return { success: false, error: `Stock updated but some errors: ${bulkResult.errors.join(', ')}` };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/** Auto-generate next PO reference: PO-YYYY-NNN */
export async function getNextPOReference(): Promise<string> {
    await requireRole(['owner', 'staff']);
    try {
        const year = new Date().getFullYear();
        const snap = await adminDb.collection('purchase_orders')
            .where('reference', '>=', `PO-${year}-`)
            .where('reference', '<', `PO-${year + 1}-`)
            .get();
        const next = snap.size + 1;
        return `PO-${year}-${String(next).padStart(3, '0')}`;
    } catch {
        return `PO-${new Date().getFullYear()}-001`;
    }
}
