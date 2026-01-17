/**
 * Consignment Types
 * 
 * A consignment is when you send inventory to a partner (retailer, event, etc.)
 * and they pay you only for what sells. Unsold items are returned.
 */

export type ConsignmentStatus =
    | 'DRAFT'        // Being prepared, not sent yet
    | 'ACTIVE'       // Sent to partner, awaiting sales/return
    | 'RECONCILING'  // Partner is returning unsold items
    | 'CLOSED'       // Fully reconciled and closed
    | 'CANCELLED';   // Cancelled before completion

export interface ConsignmentItem {
    product_id: string;
    product_name: string;
    sku: string;
    variant_sku?: string;
    variant_label?: string;
    unit_price: number;

    // Quantities
    quantity_sent: number;      // Originally sent
    quantity_sold: number;      // Confirmed sold by partner
    quantity_returned: number;  // Returned unsold
    quantity_lost: number;      // Lost/damaged at partner
}

export interface ConsignmentPartner {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
}

export interface Consignment {
    id: string;
    consignment_number: string;  // Human-readable: CON-2024-001

    // Partner info
    partner: ConsignmentPartner;

    // Status
    status: ConsignmentStatus;

    // Items
    items: ConsignmentItem[];

    // Dates
    created_at: string;
    sent_at?: string;
    expected_return_date?: string;
    reconciled_at?: string;
    closed_at?: string;

    // Financial summary
    total_sent_value: number;            // Sum of (qty_sent * unit_price)
    total_sold_value: number;            // Sum of (qty_sold * unit_price)
    total_returned_value: number;        // Sum of (qty_returned * unit_price)
    total_lost_value: number;            // Sum of (qty_lost * unit_price)
    commission_rate?: number;            // Partner's commission % (optional)

    // Audit
    notes?: string;
    created_by?: string;
    updated_at?: string;
}

/**
 * Calculate consignment summary values
 */
export function calculateConsignmentSummary(items: ConsignmentItem[]) {
    let total_sent_value = 0;
    let total_sold_value = 0;
    let total_returned_value = 0;
    let total_lost_value = 0;
    let total_sent_qty = 0;
    let total_sold_qty = 0;
    let total_returned_qty = 0;
    let total_lost_qty = 0;
    let total_pending_qty = 0;

    for (const item of items) {
        total_sent_value += item.quantity_sent * item.unit_price;
        total_sold_value += item.quantity_sold * item.unit_price;
        total_returned_value += item.quantity_returned * item.unit_price;
        total_lost_value += item.quantity_lost * item.unit_price;

        total_sent_qty += item.quantity_sent;
        total_sold_qty += item.quantity_sold;
        total_returned_qty += item.quantity_returned;
        total_lost_qty += item.quantity_lost;

        // Pending = sent - sold - returned - lost
        total_pending_qty += item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
    }

    return {
        total_sent_value,
        total_sold_value,
        total_returned_value,
        total_lost_value,
        total_sent_qty,
        total_sold_qty,
        total_returned_qty,
        total_lost_qty,
        total_pending_qty,
        is_fully_reconciled: total_pending_qty === 0
    };
}
