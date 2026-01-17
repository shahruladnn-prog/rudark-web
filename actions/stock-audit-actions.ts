'use server';

import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { StockAudit, AuditItem, AuditStatus, AuditSummary } from '@/types/stock-audit';
import { recordStockMovement } from './stock-movement-actions';

// Constants
const MAX_ITEMS_PER_AUDIT = 200;
const MAX_AUDITS_QUERY = 50;

/**
 * Generate audit number
 */
function generateAuditNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `AUD-${dateStr}-${random}`;
}

/**
 * Create a new stock audit (snapshots current stock)
 */
export async function createAudit(data: {
    store_id?: string;
    store_name?: string;
    product_ids: string[];
    notes?: string;
}): Promise<{ success: boolean; auditId?: string; error?: string }> {
    try {
        if (!data.product_ids || data.product_ids.length === 0) {
            return { success: false, error: 'Select at least one product to audit' };
        }

        if (data.product_ids.length > MAX_ITEMS_PER_AUDIT) {
            return { success: false, error: `Maximum ${MAX_ITEMS_PER_AUDIT} items per audit` };
        }

        // Fetch current stock for selected products
        const items: AuditItem[] = [];

        for (const productId of data.product_ids) {
            const productDoc = await adminDb.collection('products').doc(productId).get();
            if (!productDoc.exists) continue;

            const product = productDoc.data()!;

            // If product has variants, add each variant as separate item
            if (product.variants && product.variants.length > 0) {
                for (const variant of product.variants) {
                    items.push({
                        product_id: productId,
                        product_name: product.name,
                        variant_sku: variant.sku,
                        variant_label: Object.values(variant.options || {}).join(' / '),
                        system_quantity: variant.stock_quantity || 0,
                        counted_quantity: undefined,
                        discrepancy: undefined,
                        applied: false
                    });
                }
            } else {
                // No variants, add parent product
                items.push({
                    product_id: productId,
                    product_name: product.name,
                    system_quantity: product.stock_quantity || 0,
                    counted_quantity: undefined,
                    discrepancy: undefined,
                    applied: false
                });
            }
        }

        const audit: Omit<StockAudit, 'id'> = {
            audit_number: generateAuditNumber(),
            store_id: data.store_id,
            store_name: data.store_name,
            status: 'IN_PROGRESS',
            items,
            notes: data.notes || '',
            created_at: FieldValue.serverTimestamp()
        };

        const docRef = await adminDb.collection('stock_audits').add(audit);

        revalidatePath('/admin/stock/audit');

        return { success: true, auditId: docRef.id };

    } catch (error: any) {
        console.error('[createAudit] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update count for an audit item
 */
export async function updateAuditCount(
    auditId: string,
    itemIndex: number,
    countedQuantity: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('stock_audits').doc(auditId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Audit not found' };
        }

        const audit = doc.data() as StockAudit;

        if (audit.status !== 'IN_PROGRESS') {
            return { success: false, error: 'Audit is no longer in progress' };
        }

        if (itemIndex < 0 || itemIndex >= audit.items.length) {
            return { success: false, error: 'Invalid item index' };
        }

        // Update the item
        const updatedItems = [...audit.items];
        const item = updatedItems[itemIndex];
        item.counted_quantity = countedQuantity;
        item.discrepancy = countedQuantity - item.system_quantity;

        // Calculate summary
        const summary: AuditSummary = {
            total_items: updatedItems.length,
            counted: updatedItems.filter(i => i.counted_quantity !== undefined).length,
            discrepancies: updatedItems.filter(i => i.discrepancy && i.discrepancy !== 0).length,
            variance_value: 0 // Would need price data to calculate
        };

        await docRef.update({
            items: updatedItems,
            summary
        });

        return { success: true };

    } catch (error: any) {
        console.error('[updateAuditCount] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Move audit to reviewing status
 */
export async function submitAuditForReview(auditId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('stock_audits').doc(auditId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Audit not found' };
        }

        const audit = doc.data() as StockAudit;

        // Check all items are counted
        const uncounted = audit.items.filter(i => i.counted_quantity === undefined).length;
        if (uncounted > 0) {
            return { success: false, error: `${uncounted} items still need to be counted` };
        }

        await docRef.update({
            status: 'REVIEWING'
        });

        revalidatePath('/admin/stock/audit');

        return { success: true };

    } catch (error: any) {
        console.error('[submitAuditForReview] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Apply audit adjustments (create stock movements for discrepancies)
 */
export async function applyAuditAdjustments(auditId: string): Promise<{ success: boolean; applied: number; error?: string }> {
    try {
        const docRef = adminDb.collection('stock_audits').doc(auditId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, applied: 0, error: 'Audit not found' };
        }

        const audit = doc.data() as StockAudit;

        if (audit.status !== 'REVIEWING') {
            return { success: false, applied: 0, error: 'Audit must be in REVIEWING status' };
        }

        let appliedCount = 0;
        const updatedItems = [...audit.items];

        for (let i = 0; i < updatedItems.length; i++) {
            const item = updatedItems[i];

            // Only apply items with discrepancies that haven't been applied
            if (item.discrepancy && item.discrepancy !== 0 && !item.applied) {
                const result = await recordStockMovement({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_sku: item.variant_sku,
                    variant_label: item.variant_label,
                    type: 'ADJUST',
                    quantity: item.discrepancy, // Positive or negative
                    previous_quantity: item.system_quantity,
                    new_quantity: item.counted_quantity!,
                    reason: `Audit adjustment: ${audit.audit_number}`,
                    reference: audit.audit_number
                });

                if (result.success) {
                    updatedItems[i].applied = true;
                    appliedCount++;
                }
            }
        }

        // Update audit as completed
        await docRef.update({
            items: updatedItems,
            status: 'COMPLETED',
            completed_at: FieldValue.serverTimestamp()
        });

        revalidatePath('/admin/stock');
        revalidatePath('/admin/stock/audit');

        return { success: true, applied: appliedCount };

    } catch (error: any) {
        console.error('[applyAuditAdjustments] Error:', error);
        return { success: false, applied: 0, error: error.message };
    }
}

/**
 * Cancel an audit
 */
export async function cancelAudit(auditId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const docRef = adminDb.collection('stock_audits').doc(auditId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { success: false, error: 'Audit not found' };
        }

        const audit = doc.data() as StockAudit;

        if (audit.status === 'COMPLETED') {
            return { success: false, error: 'Cannot cancel completed audit' };
        }

        await docRef.update({
            status: 'CANCELLED'
        });

        revalidatePath('/admin/stock/audit');

        return { success: true };

    } catch (error: any) {
        console.error('[cancelAudit] Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get audits with optional filtering
 */
export async function getAudits(options: {
    status?: AuditStatus;
    limit?: number;
} = {}): Promise<StockAudit[]> {
    try {
        const { status, limit = MAX_AUDITS_QUERY } = options;

        let query: any = adminDb.collection('stock_audits')
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
            completed_at: doc.data().completed_at?.toDate?.().toISOString() || null
        })) as StockAudit[];

    } catch (error) {
        console.error('[getAudits] Error:', error);
        return [];
    }
}

/**
 * Get a single audit by ID
 */
export async function getAuditById(auditId: string): Promise<StockAudit | null> {
    try {
        const doc = await adminDb.collection('stock_audits').doc(auditId).get();

        if (!doc.exists) return null;

        const data = doc.data()!;
        return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.().toISOString() || null,
            completed_at: data.completed_at?.toDate?.().toISOString() || null
        } as StockAudit;

    } catch (error) {
        console.error('[getAuditById] Error:', error);
        return null;
    }
}
