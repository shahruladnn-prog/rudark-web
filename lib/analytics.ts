declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        fbq?: (...args: any[]) => void;
    }
}

export function trackViewItem(product: { name: string; sku: string; price: number; category?: string }) {
    if (typeof window === 'undefined') return;

    window.gtag?.('event', 'view_item', {
        currency: 'MYR',
        value: product.price,
        items: [{
            item_id: product.sku,
            item_name: product.name,
            item_category: product.category ?? '',
            price: product.price,
            quantity: 1,
        }],
    });

    window.fbq?.('track', 'ViewContent', {
        content_ids: [product.sku],
        content_name: product.name,
        content_type: 'product',
        value: product.price,
        currency: 'MYR',
    });
}

export function trackAddToCart(product: { name: string; sku: string; price: number }, quantity: number) {
    if (typeof window === 'undefined') return;

    window.gtag?.('event', 'add_to_cart', {
        currency: 'MYR',
        value: product.price * quantity,
        items: [{
            item_id: product.sku,
            item_name: product.name,
            price: product.price,
            quantity,
        }],
    });

    window.fbq?.('track', 'AddToCart', {
        content_ids: [product.sku],
        content_name: product.name,
        content_type: 'product',
        value: product.price * quantity,
        currency: 'MYR',
        num_items: quantity,
    });
}
