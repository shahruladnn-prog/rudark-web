'use server';

// Loyverse stock sync has been removed. Firebase is now the single source of truth.
// To initialize stock quantities, use the Bulk Stock Entry page: /admin/stock/bulk-entry
// To reset reserved quantities, use: POST /api/admin/cleanup?action=reset-stock

export async function syncStockFromLoyverse() {
    return {
        success: false,
        synced: 0,
        skipped: 0,
        errors: ['Loyverse sync has been removed. Use the Bulk Stock Entry page to set stock quantities.']
    };
}
