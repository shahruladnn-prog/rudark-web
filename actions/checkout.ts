'use server';

import { adminDb } from '@/lib/firebase-admin';
import { loyverse } from '@/lib/loyverse';
import { CartItem } from '@/types';
import { redirect } from 'next/navigation';

export async function createCheckoutSession(prevState: any, formData: FormData) {
    const cartJson = formData.get('cart') as string;
    const cartItems: CartItem[] = JSON.parse(cartJson);

    const customer = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        state: formData.get('state') as 'Peninsular' | 'Sabah/Sarawak',
    };

    if (!cartItems.length) {
        return { error: "Cart is empty" };
    }

    // 1. STOCK GUARD: Validate with Loyverse
    try {
        const inventoryData = await loyverse.getInventory();
        const inventoryMap = new Map(); // Variant ID -> Stock
        inventoryData.inventory_levels.forEach((inv: any) => {
            inventoryMap.set(inv.variant_id, inv.in_stock);
        });

        const outOfStockItems: string[] = [];

        for (const item of cartItems) {
            if (!item.loyverse_variant_id) continue;
            const currentStock = inventoryMap.get(item.loyverse_variant_id) || 0;

            if (currentStock < item.quantity) {
                outOfStockItems.push(`${item.name} (Stock: ${currentStock})`);
            }
        }

        if (outOfStockItems.length > 0) {
            return { error: `Sorry, some items are out of stock: ${outOfStockItems.join(', ')}` };
        }

    } catch (error) {
        console.error("Stock Guard Error:", error);
        // Fail safe? Or block? Block is safer for "Stock Guard".
        return { error: "Unable to verify stock levels. Please try again." };
    }

    // 2. Calculate Totals
    const shippingCost = customer.state === 'Peninsular' ? 10 : 20;
    const subtotal = cartItems.reduce((sum, item) => sum + item.web_price * item.quantity, 0);

    // Apply Discount
    const appliedDiscount = parseFloat(formData.get('appliedDiscount') as string || '0');
    const totalAmount = Math.max(0, subtotal + shippingCost - appliedDiscount);

    // 3. Create Pending Order in Firestore
    const orderId = `ORD-${Date.now()}`;
    const orderRef = adminDb.collection('orders').doc(orderId);

    await orderRef.set({
        id: orderId,
        customer,
        items: cartItems,
        subtotal,
        shipping_cost: shippingCost,
        discount_amount: appliedDiscount,
        total_amount: totalAmount,
        status: 'PENDING',
        created_at: new Date(),
        updated_at: new Date(),
    });

    // 4. Create Bill with BizApp Pay
    try {
        const bizAppUrl = 'https://bizappay.my/api/v3/bill/create';
        const apiKey = process.env.BIZAPP_API_KEY;
        const categoryCode = process.env.BIZAPP_CATEGORY_CODE; // Check .env
        const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/bizapp`;
        const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?order_id=${orderId}`;

        const payload = new FormData();
        payload.append('apiKey', apiKey || '');
        payload.append('category', categoryCode || '');
        payload.append('billName', `RudArk Order ${orderId}`);
        payload.append('billDescription', `Order for ${customer.name}`);
        payload.append('billTo', customer.name);
        payload.append('billEmail', 'user@example.com'); // Required by some gateways, maybe ask user?
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

        // Check BizApp response structure (assuming logic based on v3 docs)
        // Often it returns { status: true, url: '...' } or similar.
        // NOTE: Need to verify exact response structure. Assuming 'url' property.
        // If fail, return error.

        // Simplified handling based on common patterns:
        if (data.url) {
            // Update order with bill code if available
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
