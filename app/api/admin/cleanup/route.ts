import { requireAdmin } from '@/actions/session-actions';
import { NextRequest, NextResponse } from 'next/server';
import { deleteAllOrders, resetReservedStock } from '@/actions/cleanup-actions';

/**
 * Admin cleanup endpoint
 *
 * Usage:
 *   DELETE /api/admin/cleanup?action=orders    - Delete all orders
 *   POST /api/admin/cleanup?action=reset-stock - Reset reserved stock
 *   POST /api/admin/cleanup?action=full-cleanup - Delete orders + reset stock
 */

export async function DELETE(req: NextRequest) {
    try { await requireAdmin(); } catch (e: any) { return new Response(e.message, { status: 401 }); }

    const action = req.nextUrl.searchParams.get('action');

    if (action === 'orders') {
        console.log('[Cleanup API] Deleting all orders...');
        const result = await deleteAllOrders();
        return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action. Use ?action=orders' }, { status: 400 });
}

export async function POST(req: NextRequest) {
    try { await requireAdmin(); } catch (e: any) { return new Response(e.message, { status: 401 }); }

    const action = req.nextUrl.searchParams.get('action');

    switch (action) {
        case 'reset-stock':
            console.log('[Cleanup API] Resetting reserved stock...');
            const resetResult = await resetReservedStock();
            return NextResponse.json(resetResult);

        case 'full-cleanup':
            console.log('[Cleanup API] Full cleanup: delete orders + reset stock...');

            const deleteResult = await deleteAllOrders();
            if (!deleteResult.success) {
                return NextResponse.json({ success: false, step: 'delete-orders', error: deleteResult.error });
            }

            const reserveResult = await resetReservedStock();
            return NextResponse.json({
                success: reserveResult.success,
                ordersDeleted: deleteResult.deleted,
                stockReset: reserveResult.updated,
                errors: reserveResult.success ? [] : [reserveResult.error]
            });

        default:
            return NextResponse.json({
                error: 'Invalid action',
                validActions: ['reset-stock', 'sync-loyverse', 'full-cleanup']
            }, { status: 400 });
    }
}

export async function GET(req: NextRequest) {
    try { await requireAdmin(); } catch (e: any) { return new Response(e.message, { status: 401 }); }

    return NextResponse.json({
        message: 'Admin Cleanup Endpoint',
        usage: {
            'DELETE ?action=orders': 'Delete all orders from Firebase',
            'POST ?action=reset-stock': 'Reset reserved stock quantities to 0',
            'POST ?action=full-cleanup': 'Full cleanup: delete orders + reset reserved stock'
        },
        warning: 'These operations are destructive and irreversible!'
    });
}
