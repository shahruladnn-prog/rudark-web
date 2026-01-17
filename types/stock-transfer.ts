/**
 * Stock Transfer Types
 * 
 * For inter-store inventory transfers
 */

export type TransferStatus = 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface TransferItem {
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    quantity: number;
    received_quantity?: number;  // For partial receipts
}

export interface StockTransfer {
    id?: string;
    transfer_number: string;      // "TRF-20260115-001"
    from_store_id: string;
    from_store_name?: string;
    to_store_id: string;
    to_store_name?: string;
    status: TransferStatus;
    items: TransferItem[];
    notes?: string;
    created_by?: string;
    created_at?: any;
    approved_by?: string;
    approved_at?: any;
    completed_by?: string;
    completed_at?: any;
    cancelled_reason?: string;
}
