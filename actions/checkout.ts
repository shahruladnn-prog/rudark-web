'use server';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { CartItem } from '@/types';
import { redirect } from 'next/navigation';
import { processSuccessfulOrder } from '@/actions/order-utils';

// DEV MODE TOGGLE
const IS_DEV_MODE = true;

export async function createCheckoutSession(prevState: any, formData: FormData) {
    const cartJson = formData.get('cart') as string;
    const cartItems: CartItem[] = JSON.parse(cartJson);

    // Extract Customer Data (inc. Shipping)
    const customer = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        postcode: formData.get('postcode') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as 'Peninsular' | 'Sabah/Sarawak',
    };

    if (!cartItems.length) {
        return { error: "Cart is empty" };
    }

    // ATOMIC STOCK VALIDATION (prevents race conditions)
    const { validateAndReserveStock } = await import('@/actions/stock-validation');

    const stockValidation = await validateAndReserveStock(cartItems);

    if (!stockValidation.success) {
        return { error: 'error' in stockValidation ? stockValidation.error : 'Stock validation failed' };
    }

    console.log(`[Checkout] Stock reserved for ${cartItems.length} items`);

    // 2. Calculate Totals
    const shippingCost = parseFloat(formData.get('shippingCost') as string || '0');
    const subtotal = cartItems.reduce((sum, item) => sum + item.web_price * item.quantity, 0);
    const appliedDiscount = parseFloat(formData.get('appliedDiscount') as string || '0');

    // Note: formData already has 'shippingCost' from frontend which includes markup/handling
    // But we should roughly validate or trust frontend for now
    // Actually, shippingCost in formData might be string? 
    // Yes, we updated checkout page to append `shippingCost` to formData.

    const totalAmount = Math.max(0, subtotal + shippingCost - appliedDiscount);

    // 3. Create Pending Order
    const orderId = `ORD-${Date.now()}`;
    const orderRef = adminDb.collection('orders').doc(orderId);

    const deliveryMethod = formData.get('delivery_method') as 'delivery' | 'self_collection' || 'delivery';

    const orderData: any = {
        id: orderId,
        customer,
        items: cartItems,
        subtotal,
        shipping_cost: shippingCost,
        discount_amount: appliedDiscount,
        total_amount: totalAmount,
        status: IS_DEV_MODE ? 'PAID' : 'PENDING',
        created_at: new Date(),
        updated_at: new Date(),
        delivery_method: deliveryMethod
    };

    // Add delivery-specific fields
    if (deliveryMethod === 'delivery') {
        orderData.shipping_provider = formData.get('shippingProvider') || 'Unknown';
        orderData.shipping_service = formData.get('shippingService') || 'Standard';
    } else {
        // Self-collection
        orderData.collection_point_id = formData.get('collection_point_id');
        orderData.collection_point_name = formData.get('collection_point_name');
        orderData.collection_point_address = formData.get('collection_point_address');
        orderData.collection_fee = parseFloat(formData.get('collection_fee') as string || '0');
    }

    await orderRef.set(orderData);

    console.log(`[Checkout] Received Shipping Provider: '${formData.get('shippingProvider')}'`);

    // 4. DEVELOPMENT BYPASS
    if (IS_DEV_MODE) {
        console.log(`[DevMode] Bypassing Payment for Order ${orderId}`);
        // Simulate Webhook Processing
        await processSuccessfulOrder(orderId);

        // Redirect to Success
        redirect(`/checkout/success?order_id=${orderId}`);
    }

    // 5. Create Bill with BizApp Pay (Real Mode)
    try {
        const bizAppUrl = 'https://bizappay.my/api/v3/bill/create';
        const apiKey = process.env.BIZAPP_API_KEY;
        const categoryCode = process.env.BIZAPP_CATEGORY_CODE;
        const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/bizapp`;
        const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?order_id=${orderId}`;

        const payload = new FormData();
        payload.append('apiKey', apiKey || '');
        payload.append('category', categoryCode || '');
        payload.append('billName', `RudArk Order ${orderId}`);
        payload.append('billDescription', `Order for ${customer.name}`);
        payload.append('billTo', customer.name);
        payload.append('billEmail', customer.email);
        payload.append('billPhone', customer.phone);
        payload.append('billAmount', totalAmount.toFixed(2));
        payload.append('billReturnUrl', returnUrl);
        payload.append('billCallbackUrl', callbackUrl);
        payload.append('billExternalReferenceNo', orderId);

        const res = await fetch(bizAppUrl, {
            method: 'POST',
            body: payload,
        });

        const data = await res.json();

        if (data.url) {
            await orderRef.update({ bizapp_bill_code: data.billCode || '' });
            redirect(data.url);
        } else {
            console.error("BizApp Error", data);
            return { error: "Payment gateway error. Please try again." };
        }

    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error("Payment Creation Error:", error);
        return { error: "Failed to create payment bill." };
    }
}
