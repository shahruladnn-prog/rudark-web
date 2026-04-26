import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { processSuccessfulOrder } from '@/actions/order-utils';
import { getChipPublicKey } from '@/actions/payment-settings-actions';
import * as crypto from 'crypto';

/**
 * CHIP Webhook Handler
 * 
 * Handles webhook events from CHIP payment gateway
 * Events: purchase.paid, purchase.payment_failure, purchase.refunded
 * 
 * SECURED: Now verifies X-Signature header using SHA256/RSA
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Get Raw Body (Critical for signature verification)
        const rawBody = await req.text();
        const payload = JSON.parse(rawBody);

        // 2. Get Signature Header
        const signature = req.headers.get('x-signature');

        if (!signature) {
            console.error('[CHIP Webhook] Missing X-Signature header');
            // Return 401 Unauthorized for security
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        // 3. Verify Signature
        const publicKey = await getChipPublicKey();

        if (!publicKey) {
            console.error('[CHIP Webhook] ERROR: No Public Key configured. Failing closed for security.');
            return NextResponse.json({ error: 'System misconfiguration: missing CHIP public key' }, { status: 500 });
        }

        try {
            // CHIP uses RSA-SHA256
            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(rawBody);
            verifier.end();

            // Convert 'x-signature' (base64) to buffer
            const signatureBuffer = Buffer.from(signature, 'base64');

            // Format public key (ensure it has PEM headers if missing)
            // Assuming key is stored as simple clean string or full PEM
            let formattedKey = publicKey;
            if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
                formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
            }

            const isVerified = verifier.verify(formattedKey, signatureBuffer);

            if (!isVerified) {
                console.error('[CHIP Webhook] Signature verification FAILED');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }

            console.log('[CHIP Webhook] Signature Verified ✓');

        } catch (sigError) {
            console.error('[CHIP Webhook] Verification process error:', sigError);
            // Fail secure
            return NextResponse.json({ error: 'Verification error' }, { status: 401 });
        }

        // CHIP sends webhooks in different formats depending on the event
        // Format 1 (nested): { type: "purchase", purchase: { id, reference, ... } }
        // Format 2 (flat): { id, reference, status, ... }
        // We need to handle both cases

        const purchase = payload.purchase || payload; // Try nested first, then assume flat
        const eventType = payload.type || `purchase.${payload.status}`; // Derive event type

        console.log('[CHIP Webhook] Received:', {
            event: eventType,
            purchaseId: purchase?.id,
            reference: purchase?.reference,
            order_id: purchase?.order_id,
            rawPayloadKeys: Object.keys(payload)
        });

        // Idempotency: reject duplicate event delivery
        if (purchase?.id && eventType) {
            const eventKey = `${purchase.id}_${eventType}`;
            const eventRef = adminDb.collection('webhook_events').doc(eventKey);
            let alreadyProcessed = false;

            await adminDb.runTransaction(async (tx) => {
                const eventDoc = await tx.get(eventRef);
                if (eventDoc.exists) {
                    alreadyProcessed = true;
                    return;
                }
                tx.set(eventRef, {
                    event_type: eventType,
                    purchase_id: purchase.id,
                    processed_at: new Date(),
                });
            });

            if (alreadyProcessed) {
                console.log('[CHIP Webhook] Duplicate event, skipping:', eventKey);
                return NextResponse.json({ received: true, status: 'already_processed' });
            }
        }

        // Extract order ID - try multiple possible field names
        const orderId = purchase?.reference || purchase?.order_id || payload.reference || payload.order_id;

        if (!orderId) {
            console.error('[CHIP Webhook] No order ID found in payload. Full payload:', JSON.stringify(payload, null, 2));
            return NextResponse.json({ error: 'No order ID' }, { status: 400 });
        }

        // Get order from database
        const orderRef = adminDb.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            console.error('[CHIP Webhook] Order not found:', orderId);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Handle different event types
        switch (eventType) {
            case 'purchase.paid':
                console.log('[CHIP Webhook] Payment successful for order:', orderId);

                // Idempotency check - prevent double processing
                const currentOrder = orderDoc.data();
                if (currentOrder?.status === 'PAID' || currentOrder?.status === 'PROCESSING') {
                    console.log('[CHIP Webhook] Order already processed or processing, skipping:', orderId);
                    return NextResponse.json({ received: true, status: 'already_processed' });
                }

                // Verify the amount paid matches what we expect for this order.
                const expectedTotalCents = Math.round((currentOrder?.total_amount || 0) * 100);
                const paidCents = typeof purchase?.payment?.amount === 'number' ? purchase.payment.amount : null;

                if (paidCents === null) {
                    console.error('[CHIP Webhook] No payment amount in webhook payload', { orderId, purchase });
                    await orderRef.update({
                        status: 'AMOUNT_VERIFICATION_FAILED',
                        payment_verification_error: 'Missing payment.amount in webhook',
                        updated_at: new Date()
                    });
                    return NextResponse.json({ received: true, status: 'verification_failed' });
                }

                const itemCount = Array.isArray(currentOrder?.items) ? currentOrder!.items.length : 1;
                const tolerance = Math.max(itemCount, 5);

                if (Math.abs(paidCents - expectedTotalCents) > tolerance) {
                    console.error('[CHIP Webhook] Amount mismatch — refusing to mark as PAID', {
                        orderId,
                        expectedCents: expectedTotalCents,
                        paidCents,
                        diffCents: paidCents - expectedTotalCents
                    });
                    await orderRef.update({
                        status: 'AMOUNT_MISMATCH',
                        payment_amount_paid_cents: paidCents,
                        payment_amount_expected_cents: expectedTotalCents,
                        payment_verification_error: `Mismatch: paid ${paidCents} cents, expected ${expectedTotalCents} cents`,
                        updated_at: new Date()
                    });
                    return NextResponse.json({ received: true, status: 'amount_mismatch' });
                }

                // 1. Mark as PROCESSING to lock the record
                await orderRef.update({
                    status: 'PROCESSING',
                    payment_status: 'paid',
                    chip_payment_data: {
                        purchase_id: purchase.id,
                        payment_method: purchase.transaction_data?.payment_method,
                        paid_on: purchase.payment?.paid_on,
                        amount: purchase.payment?.amount,
                        currency: purchase.payment?.currency
                    },
                    updated_at: new Date()
                });

                // 2. Process fulfillment logic
                try {
                    await processSuccessfulOrder(orderId);
                    
                    // 3. Mark as PAID only after successful processing
                    await orderRef.update({
                        status: 'PAID',
                        processed_at: new Date(),
                        updated_at: new Date()
                    });
                    console.log('[CHIP Webhook] Fulfillment completed successfully:', orderId);
                } catch (fulfillError: any) {
                    console.error('[CHIP Webhook] Fulfillment CRASHED:', fulfillError);
                    await orderRef.update({
                        status: 'FULFILLMENT_FAILED',
                        fulfillment_error: fulfillError?.message || String(fulfillError),
                        updated_at: new Date()
                    });
                    // Still return 200/received to CHIP as we've captured the error state locally
                    // and don't want an endless loop of retries if it's a persistent code error.
                    return NextResponse.json({ received: true, status: 'fulfillment_failed' });
                }

                break;

            case 'purchase.payment_failure':
                console.log('[CHIP Webhook] Payment failed for order:', orderId);

                await orderRef.update({
                    status: 'PAYMENT_FAILED',
                    payment_status: 'failed',
                    chip_payment_data: {
                        purchase_id: purchase.id,
                        error: purchase.transaction_data?.attempts?.[0]?.error
                    },
                    updated_at: new Date()
                });

                break;

            case 'purchase.refunded':
                console.log('[CHIP Webhook] Payment refunded for order:', orderId);

                await orderRef.update({
                    status: 'REFUNDED',
                    payment_status: 'refunded',
                    chip_refund_data: {
                        refunded_on: new Date(),
                        refund_amount: purchase.payment?.amount
                    },
                    updated_at: new Date()
                });

                // TODO: Handle stock restoration if needed

                break;

            default:
                console.log('[CHIP Webhook] Unhandled event type:', eventType);
        }

        // Return success response
        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('[CHIP Webhook] Error processing webhook:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// Handle GET requests (for webhook verification if needed)
export async function GET(req: NextRequest) {
    return NextResponse.json({
        message: 'CHIP Webhook Endpoint',
        status: 'active'
    });
}
