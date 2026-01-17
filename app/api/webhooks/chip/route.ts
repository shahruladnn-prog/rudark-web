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

        if (publicKey) {
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
        } else {
            console.warn('[CHIP Webhook] WARNING: No Public Key configured. Skipping verification. THIS IS INSECURE.');
            // TODO: In production, this should fail. For now, allow but log heavily.
        }

        console.log('[CHIP Webhook] Received:', {
            event: payload.type,
            purchaseId: payload.purchase?.id,
            reference: payload.purchase?.reference
        });

        // Extract event data
        const eventType = payload.type;
        const purchase = payload.purchase;
        const orderId = purchase?.reference || purchase?.order_id;

        if (!orderId) {
            console.error('[CHIP Webhook] No order ID found in payload');
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
                if (currentOrder?.status === 'PAID') {
                    console.log('[CHIP Webhook] Order already processed, skipping:', orderId);
                    return NextResponse.json({ received: true, status: 'already_processed' });
                }

                // Update order with payment details
                await orderRef.update({
                    status: 'PAID',
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

                // Process successful order (stock deduction, Loyverse sync, etc.)
                await processSuccessfulOrder(orderId);

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
