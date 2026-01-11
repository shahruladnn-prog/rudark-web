import { NextRequest, NextResponse } from 'next/server';
import { processSuccessfulOrder } from '@/actions/order-utils';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Manual Order Processing Endpoint (for localhost testing)
 * 
 * Since webhooks can't reach localhost, use this to manually process orders
 * GET /api/admin/process-order?order_id=ORD-xxx
 */
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const orderId = searchParams.get('order_id');

        if (!orderId) {
            return NextResponse.json({ error: 'order_id required' }, { status: 400 });
        }

        // Get order
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const order = orderDoc.data();

        // Check if already processed
        if (order?.status === 'PAID') {
            return NextResponse.json({
                message: 'Order already processed',
                orderId,
                status: 'PAID'
            });
        }

        console.log('[Manual Process] Processing order:', orderId);

        // Update order status to PAID
        await adminDb.collection('orders').doc(orderId).update({
            status: 'PAID',
            payment_status: 'paid',
            manually_processed: true,
            processed_at: new Date()
        });

        // Process order (Loyverse, stock, shipping)
        await processSuccessfulOrder(orderId);

        return NextResponse.json({
            success: true,
            message: 'Order processed successfully',
            orderId,
            actions: [
                'Order status updated to PAID',
                'Loyverse receipt created',
                'Stock deducted',
                'Shipping order created (if applicable)'
            ]
        });

    } catch (error) {
        console.error('[Manual Process] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process order', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
