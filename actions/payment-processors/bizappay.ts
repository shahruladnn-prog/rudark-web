'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CartItem } from '@/types';
import { redirect } from 'next/navigation';
import { getBizappayApiKey } from '@/actions/payment-settings-actions';

/**
 * Process payment via BizAppay gateway
 */
export async function processBizAppayPayment(
    orderId: string,
    cartItems: CartItem[],
    customer: any,
    totalAmount: number
) {
    try {
        const apiKey = await getBizappayApiKey();
        const categoryCode = process.env.BIZAPP_CATEGORY_CODE!;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // Step 1: Get authentication token
        const tokenUrl = 'https://bizappay.my/api/v3/token';
        const tokenPayload = new FormData();
        tokenPayload.append('apiKey', apiKey);

        const tokenRes = await fetch(tokenUrl, {
            method: 'POST',
            body: tokenPayload,
        });

        const tokenData = await tokenRes.json();

        if (tokenData.status !== 'ok' || !tokenData.token) {
            console.error('[BizAppay] Token error:', tokenData);
            return { error: `Authentication failed: ${tokenData.msg || 'Invalid API key'}` };
        }

        console.log('[BizAppay] Token obtained successfully');

        // Step 2: Create bill with token
        const bizAppUrl = 'https://bizappay.my/api/v3/bill/create';
        const callbackUrl = `${baseUrl}/api/webhooks/bizapp`;
        const returnUrl = `${baseUrl}/checkout/success?order_id=${orderId}`;

        const payload = new FormData();
        payload.append('apiKey', apiKey);
        payload.append('category', categoryCode);
        payload.append('name', `RudArk Order ${orderId}`);
        payload.append('amount', totalAmount.toFixed(2)); // BizAppay uses decimal format
        payload.append('payer_name', customer.name);
        payload.append('payer_email', customer.email);
        payload.append('payer_phone', customer.phone || '');
        payload.append('webreturn_url', returnUrl);
        payload.append('callback_url', callbackUrl);
        payload.append('ext_reference', orderId);

        console.log('[BizAppay] Creating bill:', {
            orderId,
            amount: totalAmount.toFixed(2),
            customer: customer.email
        });


        const res = await fetch(bizAppUrl, {
            method: 'POST',
            headers: {
                'Authentication': tokenData.token
            },
            body: payload,
        });

        const data = await res.json();

        console.log('[BizAppay] Full API Response:', {
            status: res.status,
            statusText: res.statusText,
            data: data
        });

        if (data.url) {
            console.log('[BizAppay] Bill created:', {
                billCode: data.billCode,
                url: data.url
            });

            // Update order with BizAppay bill code
            await adminDb.collection('orders').doc(orderId).update({
                bizapp_bill_code: data.billCode || '',
                payment_gateway: 'bizappay'
            });

            // Redirect to BizAppay payment page
            redirect(data.url);
        } else {
            console.error('[BizAppay] Error:', data);
            return { error: `Payment gateway error: ${data.msg || 'Please try again.'}` };
        }

    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error('[BizAppay] Payment creation error:', error);
        return { error: 'Failed to create payment bill.' };
    }
}
