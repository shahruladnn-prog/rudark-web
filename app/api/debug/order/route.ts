import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Get raw order data from Firebase
 * GET /api/debug/order?orderId=ORD-xxx
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
        return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    try {
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderData = orderDoc.data();

        // Return relevant fields for debugging
        return NextResponse.json({
            success: true,
            orderId,
            status: orderData?.status,
            payment_status: orderData?.payment_status,
            loyverse_status: orderData?.loyverse_status,
            loyverse_error: orderData?.loyverse_error,
            shipping_status: orderData?.shipping_status,
            shipping_error: orderData?.shipping_error,
            parcelasia_shipment_id: orderData?.parcelasia_shipment_id,
            tracking_no: orderData?.tracking_no,
            items: orderData?.items?.map((item: any) => ({
                name: item.name,
                sku: item.sku,
                variant_sku: item.variant_sku,
                loyverse_variant_id: item.loyverse_variant_id
            }))
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
