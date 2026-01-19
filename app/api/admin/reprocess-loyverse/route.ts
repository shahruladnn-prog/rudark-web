import { NextRequest, NextResponse } from 'next/server';
import { reprocessLoyverseSync } from '@/actions/reprocess-loyverse';

/**
 * API Endpoint to re-process failed Loyverse syncs
 * 
 * Usage: POST /api/admin/reprocess-loyverse
 * Body: { "orderId": "ORD-1234567890" }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json(
                { success: false, error: 'orderId is required' },
                { status: 400 }
            );
        }

        console.log(`[API] Re-processing Loyverse sync for order: ${orderId}`);

        const result = await reprocessLoyverseSync(orderId);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[API] Reprocess error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Unknown error' },
            { status: 500 }
        );
    }
}

// GET endpoint for quick testing via browser
export async function GET(req: NextRequest) {
    const orderId = req.nextUrl.searchParams.get('orderId');

    if (!orderId) {
        return NextResponse.json({
            message: 'Loyverse Reprocess Endpoint',
            usage: 'GET /api/admin/reprocess-loyverse?orderId=ORD-XXXXX or POST with body { "orderId": "ORD-XXXXX" }'
        });
    }

    console.log(`[API] Re-processing Loyverse sync for order: ${orderId}`);

    const result = await reprocessLoyverseSync(orderId);

    return NextResponse.json(result);
}
