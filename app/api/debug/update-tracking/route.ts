import { NextRequest, NextResponse } from 'next/server';
import { updateTrackingManually } from '@/actions/parcelasia-sync';

/**
 * Manually update tracking number for an order
 * GET /api/debug/update-tracking?orderId=ORD-xxx&trackingNo=xxx
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const trackingNo = searchParams.get('trackingNo');

    if (!orderId || !trackingNo) {
        return NextResponse.json(
            { error: 'orderId and trackingNo required' },
            { status: 400 }
        );
    }

    try {
        const result = await updateTrackingManually(orderId, trackingNo);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Tracking number ${trackingNo} updated for order ${orderId}`
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            );
        }
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
