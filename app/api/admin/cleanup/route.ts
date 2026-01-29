import { NextRequest, NextResponse } from 'next/server';
import { deleteAllOrders, resetReservedStock } from '@/actions/cleanup-actions';
import { syncStockFromLoyverse } from '@/actions/stock-sync-actions';

/**
 * Admin cleanup endpoint
 * 
 * Usage:
 *   DELETE /api/admin/cleanup?action=orders    - Delete all orders
 *   POST /api/admin/cleanup?action=reset-stock - Reset reserved stock
 *   POST /api/admin/cleanup?action=sync-loyverse - Sync stock from Loyverse
 *   POST /api/admin/cleanup?action=full-cleanup - Delete orders + reset stock + sync
 */

export async function DELETE(req: NextRequest) {
    const action = req.nextUrl.searchParams.get('action');

    if (action === 'orders') {
        console.log('[Cleanup API] Deleting all orders...');
        const result = await deleteAllOrders();
        return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=orders' }, { status: 400 });
}

export async function POST(req: NextRequest) {
    const action = req.nextUrl.searchParams.get('action');

    switch (action) {
        case 'reset-stock':
            console.log('[Cleanup API] Resetting reserved stock...');
            const resetResult = await resetReservedStock();
            return NextResponse.json(resetResult);

        case 'sync-loyverse':
            console.log('[Cleanup API] Syncing stock from Loyverse...');
            const syncResult = await syncStockFromLoyverse();
            return NextResponse.json(syncResult);

        case 'full-cleanup':
            console.log('[Cleanup API] Full cleanup: orders + stock reset + Loyverse sync...');

            // Step 1: Delete all orders
            const deleteResult = await deleteAllOrders();
            if (!deleteResult.success) {
                return NextResponse.json({
                    success: false,
                    step: 'delete-orders',
                    error: deleteResult.error
                });
            }

            // Step 2: Reset reserved stock
            const reserveResult = await resetReservedStock();
            if (!reserveResult.success) {
                return NextResponse.json({
                    success: false,
                    step: 'reset-stock',
                    error: reserveResult.error,
                    ordersDeleted: deleteResult.deleted
                });
            }

            // Step 3: Sync from Loyverse
            const loyverseResult = await syncStockFromLoyverse();

            return NextResponse.json({
                success: loyverseResult.success,
                ordersDeleted: deleteResult.deleted,
                stockReset: reserveResult.updated,
                loyverseSynced: loyverseResult.synced,
                loyverseSkipped: loyverseResult.skipped,
                errors: loyverseResult.errors
            });

        default:
            return NextResponse.json({
                error: 'Invalid action',
                validActions: ['reset-stock', 'sync-loyverse', 'full-cleanup']
            }, { status: 400 });
    }
}

export async function GET(req: NextRequest) {
    return NextResponse.json({
        message: 'Admin Cleanup Endpoint',
        usage: {
            'DELETE ?action=orders': 'Delete all orders from Firebase',
            'POST ?action=reset-stock': 'Reset reserved stock quantities to 0',
            'POST ?action=sync-loyverse': 'Sync stock levels from Loyverse to Firebase',
            'POST ?action=full-cleanup': 'Full cleanup: delete orders + reset stock + sync from Loyverse'
        },
        warning: 'These operations are destructive and irreversible!'
    });
}
