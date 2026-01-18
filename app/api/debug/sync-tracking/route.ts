'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { fetchTrackingFromParcelAsia } from '@/actions/parcelasia-sync';

/**
 * Manual Tracking Sync API
 * Fetches tracking from ParcelAsia for orders that have shipment_id but no tracking_no
 * 
 * GET /api/debug/sync-tracking?orderId=ORD-xxx
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
        return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    try {
        console.log(`[ManualTrackingSync] Starting for order: ${orderId}`);

        // Get the order
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const order = orderSnap.data();

        // Check if already has tracking
        if (order?.tracking_no && order.tracking_no !== 'PENDING') {
            return NextResponse.json({
                success: true,
                message: 'Order already has tracking number',
                tracking_no: order.tracking_no
            });
        }

        // Check if has ParcelAsia shipment ID
        const shipmentId = order?.parcelasia_shipment_id;
        if (!shipmentId) {
            return NextResponse.json({
                error: 'Order has no ParcelAsia shipment ID',
                suggestion: 'This order may not have been processed through ParcelAsia'
            }, { status: 400 });
        }

        console.log(`[ManualTrackingSync] Fetching tracking for shipment: ${shipmentId}`);

        // Fetch tracking from ParcelAsia
        const result = await fetchTrackingFromParcelAsia(shipmentId);

        if (result.success && result.tracking_no) {
            // Update the order
            await orderRef.update({
                tracking_no: result.tracking_no,
                tracking_synced: true,
                updated_at: new Date()
            });

            console.log(`[ManualTrackingSync] Success! Tracking: ${result.tracking_no}`);

            return NextResponse.json({
                success: true,
                tracking_no: result.tracking_no,
                message: 'Tracking number synced successfully'
            });
        } else {
            console.log(`[ManualTrackingSync] Failed:`, result.error);
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to fetch tracking',
                status: result.status
            }, { status: 400 });
        }
    } catch (error: any) {
        console.error('[ManualTrackingSync] Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}
