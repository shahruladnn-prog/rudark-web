import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';

// Force dynamic needed for webhooks usually to avoid caching
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        // 1. Parse BizApp Payload
        // BizApp usually sends form-data or JSON. Assuming form-data check documentation.
        // Documentation says it posts data. Let's assume standard form data or try both.
        const contentType = req.headers.get('content-type') || '';

        let billStatus = '';
        let externalReference = '';
        let billCode = '';

        if (contentType.includes('application/json')) {
            const json = await req.json();
            billStatus = json.billstatus;
            externalReference = json.refno || json.order_id || json.billExternalReferenceNo;
            billCode = json.billcode;
        } else {
            const formData = await req.formData();
            billStatus = formData.get('billstatus') as string;
            externalReference = formData.get('billExternalReferenceNo') as string;
            billCode = formData.get('billcode') as string;
        }

        // billStatus = 1 means Success (usually, check BizApp V3 docs)
        // 0 = Fail, 2 = Pending
        if (billStatus !== '1') {
            console.log(`Payment failed/pending for ${externalReference}, status: ${billStatus}`);
            return NextResponse.json({ status: 'ignored' });
        }

        if (!externalReference) {
            return NextResponse.json({ error: 'Missing Reference' }, { status: 400 });
        }

        const orderId = externalReference;
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            console.error(`Order ${orderId} not found`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderData = orderSnap.data();

        // 2. Idempotency Check
        if (orderData?.status === 'PAID') {
            console.log(`Order ${orderId} already paid`);
            return NextResponse.json({ status: 'ok' });
        }

        // 3. Update Order Status
        await orderRef.update({
            status: 'PAID',
            paid_at: new Date(),
            bizapp_redirect_data: { billStatus, billCode }
        });

        // 4. Deduct Stock in Loyverse
        // We iterate over items and create a "Receipt" in Loyverse
        // This is crucial to accurately update stock.
        const receiptLines = orderData?.items.map((item: any) => ({
            variant_id: item.loyverse_variant_id,
            quantity: item.quantity,
            price_money: item.web_price, // Use actual sold price
            // Note: Loyverse API might require item_id too, checking client lib...
            // API v1.0 receipts wants { variant_id, quantity, price, discount... }
        }));

        if (receiptLines && receiptLines.length > 0) {
            try {
                // Note: date must be ISO 8601
                await loyverse.createReceipt({
                    receipt_date: new Date().toISOString(),
                    note: `Web Order ${orderId}`,
                    line_items: receiptLines,
                    // Optional: Customer info if implementing Loyverse CRM
                    total_money: orderData?.total_amount
                });
                console.log(`Loyverse Receipt Created for ${orderId}`);
            } catch (loyverseError) {
                console.error(`Failed to create Loyverse receipt for ${orderId}`, loyverseError);
                // We do NOT rollback payment, this needs manual intervention/logging
                // Maybe add a field "loyverse_sync_error" to order
                await orderRef.update({ loyverse_sync_status: 'FAILED' });
            }
        }

        return NextResponse.json({ status: 'ok' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
