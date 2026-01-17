'use server';

import { adminDb } from '@/lib/firebase-admin';
import { CartItem } from '@/types';
import { getPaymentSettings } from '@/actions/payment-settings-actions';
import { processChipPayment } from '@/actions/payment-processors/chip';
// BizAppay removed - using CHIP as primary gateway
import { processManualPayment } from '@/actions/payment-processors/manual';

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
        status: 'PENDING', // Always start as PENDING, will be updated by webhook
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

    // 4. Get Payment Gateway Settings
    const paymentSettings = await getPaymentSettings();
    let activeGateway = paymentSettings.enabled_gateway;

    // Fallback to CHIP if gateway is not configured or is a legacy value
    if (activeGateway !== 'chip' && activeGateway !== 'manual') {
        console.log(`[Checkout] Unknown gateway '${activeGateway}', defaulting to CHIP`);
        activeGateway = 'chip';
    }

    console.log(`[Checkout] Active Payment Gateway: ${activeGateway}`);

    // 5. Route to Appropriate Payment Processor
    try {
        switch (activeGateway) {
            case 'chip':
                return await processChipPayment(
                    orderId,
                    cartItems,
                    customer,
                    totalAmount,
                    shippingCost,
                    appliedDiscount
                );

            // BizAppay removed - CHIP is now primary gateway

            case 'manual':
                return await processManualPayment(orderId);

            default:
                // This should never happen now due to fallback above
                console.error(`[Checkout] Unexpected gateway: ${activeGateway}`);
                return await processChipPayment(
                    orderId,
                    cartItems,
                    customer,
                    totalAmount,
                    shippingCost,
                    appliedDiscount
                );
        }
    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error('[Checkout] Payment processing error:', error);
        return { error: 'Payment processing failed. Please try again.' };
    }
}
