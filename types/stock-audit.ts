/**
 * Stock Audit Types
 * 
 * For inventory counting and discrepancy management
 */

export type AuditStatus = 'IN_PROGRESS' | 'REVIEWING' | 'COMPLETED' | 'CANCELLED';

export interface AuditItem {
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    system_quantity: number;      // Expected (snapshot at creation)
    counted_quantity?: number;    // Physical count entered by user
    discrepancy?: number;         // counted - system
    applied: boolean;             // Whether adjustment was made
}

export interface AuditSummary {
    total_items: number;
    counted: number;
    discrepancies: number;
    variance_value: number;       // Total monetary variance
}

export interface StockAudit {
    id?: string;
    audit_number: string;         // "AUD-20260115-001"
    store_id?: string;
    store_name?: string;
    status: AuditStatus;
    items: AuditItem[];
    summary?: AuditSummary;
    notes?: string;
    created_by?: string;
    created_at?: any;
    completed_at?: any;
}
