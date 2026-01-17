'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CartItem } from '@/types';
import { redirect } from 'next/navigation';
import { getPaymentSettings, getChipApiKey } from '@/actions/payment-settings-actions';

interface ChipPurchaseRequest {
    brand_id: string;
    client: {
        email: string;
        phone: string;
        full_name: string;
        street_address?: string;
        city?: string;
        zip_code?: string;
        state?: string;
        shipping_street_address?: string;
        shipping_city?: string;
        shipping_zip_code?: string;
        shipping_state?: string;
    };
    purchase: {
        products: Array<{
            name: string;
            price: number; // in cents!
            quantity: number;
        }>;
        currency: string;
    };
    reference: string;
    order_id: string;
    success_redirect: string;
    failure_redirect: string;
    cancel_redirect: string;
    success_callback: string;
}

/**
 * Process payment via CHIP gateway
 */
export async function processChipPayment(
    orderId: string,
    cartItems: CartItem[],
    customer: any,
    totalAmount: number,
    shippingCost: number,
    discount: number
) {
    try {
        const settings = await getPaymentSettings();
        const apiKey = await getChipApiKey(settings.chip.environment);

        // Convert cart items to CHIP products format
        // If there's a discount, we need to distribute it across items proportionally
        // CHIP does NOT accept negative price line items
        let products: Array<{ name: string; price: number; quantity: number }> = [];

        const itemsSubtotal = cartItems.reduce((sum, item) => sum + (item.promo_price || item.web_price) * item.quantity, 0);
        const discountRatio = discount > 0 ? discount / itemsSubtotal : 0;

        products = cartItems.map(item => {
            const originalPrice = item.promo_price || item.web_price;
            // Apply discount proportionally to each item
            const discountedPrice = discount > 0
                ? originalPrice * (1 - discountRatio)
                : originalPrice;
            return {
                name: item.name,
                price: Math.max(1, Math.round(discountedPrice * 100)), // Convert to cents, min 1 cent
                quantity: item.quantity
            };
        });

        // Add shipping as a product if applicable
        if (shippingCost > 0) {
            products.push({
                name: 'Shipping Fee',
                price: Math.round(shippingCost * 100),
                quantity: 1
            });
        }

        // Note: Discount is already applied to item prices above, no need for negative line item

        // Note: Discount is already applied to item prices above, no need for negative line item

        // Smart Base URL resolution
        let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        if (!baseUrl) {
            if (process.env.VERCEL_URL) {
                baseUrl = `https://${process.env.VERCEL_URL}`;
            } else if (process.env.NEXT_PUBLIC_VERCEL_URL) {
                baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
            } else {
                baseUrl = 'http://localhost:3000';
            }
        }

        // Remove trailing slash if present
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // CHIP doesn't allow custom ports in webhook URLs
        // For localhost testing, use a placeholder URL (webhook won't work locally anyway)
        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        const webhookUrl = isLocalhost
            ? 'https://example.com/api/webhooks/chip' // Placeholder for local testing
            : `${baseUrl}/api/webhooks/chip`;

        const purchaseRequest: ChipPurchaseRequest = {
            brand_id: settings.chip.brand_id,
            client: {
                email: customer.email,
                phone: customer.phone || '',
                full_name: customer.name,
                street_address: customer.address || '',
                city: customer.city || 'N/A',
                zip_code: customer.postcode || '00000',
                state: customer.state || 'N/A',
                shipping_street_address: customer.address || '',
                shipping_city: customer.city || 'N/A',
                shipping_zip_code: customer.postcode || '00000',
                shipping_state: customer.state || 'N/A'
            },
            purchase: {
                products,
                currency: 'MYR'
            },
            reference: orderId,
            order_id: orderId,
            success_redirect: `${baseUrl}/checkout/success?order_id=${orderId}`,
            failure_redirect: `${baseUrl}/checkout?error=payment_failed`,
            cancel_redirect: `${baseUrl}/checkout?error=payment_cancelled`,
            success_callback: webhookUrl
        };

        console.log('[CHIP] Creating purchase:', {
            orderId,
            environment: settings.chip.environment,
            amount: totalAmount,
            products: products.length
        });

        const response = await fetch('https://gate.chip-in.asia/api/v1/purchases/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(purchaseRequest)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[CHIP] API Error:', errorText);
            throw new Error(`CHIP API error: ${response.status}`);
        }

        const data = await response.json();

        console.log('[CHIP] Purchase created:', {
            id: data.id,
            status: data.status,
            checkout_url: data.checkout_url
        });

        // Update order with CHIP purchase ID
        await adminDb.collection('orders').doc(orderId).update({
            chip_purchase_id: data.id,
            payment_gateway: 'chip',
            chip_environment: settings.chip.environment
        });

        // Redirect to CHIP checkout page
        redirect(data.checkout_url);

    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[CHIP] Payment creation error:', errorMessage);
        console.error('[CHIP] Full error:', error);
        return { error: `Failed to create CHIP payment: ${errorMessage}` };
    }
}

/**
 * Verify CHIP payment status
 */
export async function verifyChipPayment(purchaseId: string) {
    try {
        const settings = await getPaymentSettings();
        const apiKey = await getChipApiKey(settings.chip.environment);

        const response = await fetch(`https://gate.chip-in.asia/api/v1/purchases/${purchaseId}/`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to verify payment: ${response.status}`);
        }

        const data = await response.json();

        return {
            success: true,
            status: data.status,
            paid: data.status === 'paid',
            payment: data.payment
        };
    } catch (error) {
        console.error('[CHIP] Verification error:', error);
        return { success: false, error: 'Failed to verify payment' };
    }
}
