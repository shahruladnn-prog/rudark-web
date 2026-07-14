'use server';

import { adminDb } from '@/lib/firebase-admin';
import { redirect } from 'next/navigation';
import { requireRole } from '@/actions/session-actions';
import { logAdminAction } from '@/actions/admin-log-actions';
import { createChipPurchase } from '@/actions/payment-processors/chip';
import { getStateFromPostcode } from '@/utils/postcode-state-mapping';
import { priceAddonLines } from '@/lib/pre-order-addons';
import { matchVariant, validPrice } from '@/lib/variant-utils';
import { Product } from '@/types';

/**
 * Customer-facing: create a pre-order and charge only the deposit via CHIP.
 * Never trusts client-submitted price/sku — only the selected option values;
 * the real price/sku/image are resolved server-side from the Firestore product/variant.
 */
export async function createPreOrder(prevState: any, formData: FormData) {
    const productId = formData.get('productId') as string;
    const quantity = Math.max(1, parseInt((formData.get('quantity') as string) || '1', 10));

    let selectedOptions: Record<string, string> | undefined;
    const selectedOptionsRaw = formData.get('selected_options') as string | null;
    if (selectedOptionsRaw) {
        try {
            const parsed = JSON.parse(selectedOptionsRaw);
            if (parsed && Object.keys(parsed).length > 0) selectedOptions = parsed;
        } catch {
            // ignore malformed selection, fall back to base product pricing
        }
    }

    if (!productId) return { error: 'Missing product' };

    const productDoc = await adminDb.collection('products').doc(productId).get();
    if (!productDoc.exists) return { error: 'Product not found' };
    const product = { id: productDoc.id, ...productDoc.data() } as Product;

    if (!product.is_pre_order) return { error: 'This product is not available for pre-order' };

    const activeVariant = matchVariant(product, selectedOptions);
    const unitPrice = activeVariant
        ? validPrice(activeVariant.price, activeVariant.promo_price)
        : validPrice(product.web_price, product.promo_price);
    const itemSku = activeVariant?.sku || product.sku;
    const itemImage = activeVariant?.image || product.images?.[0] || '';

    const depositPercent = product.pre_order_deposit_percent && product.pre_order_deposit_percent > 0 && product.pre_order_deposit_percent <= 100
        ? product.pre_order_deposit_percent
        : 100; // Safe fallback: full payment if not configured

    const customer = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        postcode: formData.get('postcode') as string,
        city: formData.get('city') as string,
        state: getStateFromPostcode((formData.get('postcode') as string) || ''),
    };

    if (!customer.name || !customer.email || !customer.phone || !customer.address || !customer.postcode) {
        return { error: 'Please fill in all required fields' };
    }

    // No stock reservation for pre-orders — items aren't physically in stock yet.
    // No shipping charge either — the boat's price already includes shipping.

    const boatSubtotal = unitPrice * quantity;

    const addonQuantities: Record<string, number> = {};
    for (const key of formData.keys()) {
        if (key.startsWith('addon_')) {
            addonQuantities[key.slice('addon_'.length)] = parseInt((formData.get(key) as string) || '0', 10);
        }
    }
    const addonLines = priceAddonLines(addonQuantities);
    const addonsSubtotal = addonLines.reduce((sum, line) => sum + line.web_price * line.quantity, 0);
    const subtotal = boatSubtotal + addonsSubtotal;

    const depositAmount = Math.round(subtotal * depositPercent / 100 * 100) / 100;
    const balanceAmount = Math.round((subtotal - depositAmount) * 100) / 100;

    const orderId = `ORD-${Date.now()}`;
    const orderRef = adminDb.collection('orders').doc(orderId);

    const orderData: any = {
        id: orderId,
        customer,
        items: [
            {
                ...product,
                sku: itemSku,
                web_price: unitPrice,
                images: itemImage ? [itemImage] : product.images,
                quantity,
                selected_options: activeVariant?.options,
            },
            ...addonLines,
        ],
        is_pre_order: true,
        subtotal,
        shipping_cost: 0,
        discount_amount: 0,
        total_amount: depositAmount,
        pre_order_full_total: subtotal,
        pre_order_deposit_percent: depositPercent,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        balance_status: 'not_due',
        status: 'PENDING',
        created_at: new Date(),
        updated_at: new Date(),
        delivery_method: 'delivery',
    };

    await orderRef.set(orderData);

    const variantLabel = activeVariant?.options ? ` (${Object.values(activeVariant.options).join(', ')})` : '';
    const depositProducts = [{
        name: `${product.name}${variantLabel} — Pre-Order Deposit (${depositPercent}%)`.slice(0, 100),
        price: Math.round(depositAmount * 100),
        quantity: 1,
    }];

    const result = await createChipPurchase(orderId, depositProducts, customer, {
        successPath: `/preorder/success?order_id=${orderId}`,
        failurePath: `/preorder/${product.sku}?error=payment_failed`,
        cancelPath: `/preorder/${product.sku}?error=payment_cancelled`,
    });

    if ('error' in result) {
        return { error: result.error };
    }

    await orderRef.update({
        chip_purchase_id: result.id,
        payment_gateway: 'chip',
    });

    redirect(result.checkout_url);
}

/**
 * Admin-facing: generate a CHIP payment link for the remaining balance once
 * the deposit has been paid. Returns the checkout URL for the admin to share
 * (e.g. via WhatsApp) — no automated email system exists in this codebase.
 */
export async function collectPreOrderBalance(orderId: string): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
    await requireRole(['owner', 'staff']);

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) return { success: false, error: 'Order not found' };

    const order = orderDoc.data()!;
    if (!order.is_pre_order) return { success: false, error: 'Not a pre-order' };
    if (order.status !== 'DEPOSIT_PAID') {
        return { success: false, error: `Cannot collect balance while order is ${order.status}` };
    }
    if (!order.balance_amount || order.balance_amount <= 0) {
        return { success: false, error: 'No balance due on this order' };
    }

    const depositItem = order.items?.[0];
    const balanceItem: Array<{ name: string; price: number; quantity: number }> = [{
        name: `${depositItem?.name || 'Pre-Order Item'} — Balance Payment`.slice(0, 100),
        price: Math.round(order.balance_amount * 100),
        quantity: 1,
    }];

    const result = await createChipPurchase(orderId, balanceItem, order.customer, {
        successPath: `/preorder/success?order_id=${orderId}&type=balance`,
        failurePath: `/preorder/success?order_id=${orderId}&type=balance&error=payment_failed`,
        cancelPath: `/preorder/success?order_id=${orderId}&type=balance&error=payment_cancelled`,
    });
    if ('error' in result) {
        return { success: false, error: result.error };
    }

    await orderRef.update({
        chip_balance_purchase_id: result.id,
        status: 'BALANCE_DUE',
        updated_at: new Date(),
    });

    try {
        await logAdminAction('COLLECT_PREORDER_BALANCE', 'order', orderId, { balance_amount: order.balance_amount });
    } catch {
        // Logging failures must not break the balance link generation
    }

    return { success: true, checkoutUrl: result.checkout_url };
}
