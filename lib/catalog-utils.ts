import { CatalogEntry, CatalogItem, Product, PurchaseMode, PriceDisplay } from '@/types';

export function resolvePurchaseMode(product: Partial<Product>): PurchaseMode {
    if (product.purchase_mode) return product.purchase_mode;
    if (product.stock_status === 'CONTACT_US') return 'inquire';
    if (product.is_public) return 'online';
    return 'inquire';
}

export function resolvePriceDisplay(product: Partial<Product>): PriceDisplay {
    if (product.price_display) return product.price_display;
    if (product.stock_status === 'CONTACT_US') return 'from';
    return 'fixed';
}

export function isProductInCatalog(product: Product): boolean {
    if (product.stock_status === 'ARCHIVED') return false;
    if (product.show_in_catalog === false) return false;
    if (product.show_in_catalog === true) return true;
    return product.is_public === true || product.stock_status === 'CONTACT_US';
}

export function productToCatalogItem(product: Product & { id: string }): CatalogItem {
    return {
        id: product.id!,
        source: 'product',
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        images: product.images || [],
        image_thumbnails: product.image_thumbnails,
        category_slug: product.category_slug,
        web_price: product.web_price,
        promo_price: product.promo_price,
        purchase_mode: resolvePurchaseMode(product),
        price_display: resolvePriceDisplay(product),
        catalog_tags: product.catalog_tags || product.tags,
        use_cases: product.use_cases,
        moq: product.moq,
        lead_time_days: product.lead_time_days,
        customizable: product.customizable,
        catalog_featured: product.catalog_featured ?? product.is_featured,
        catalog_sort: product.catalog_sort,
        stock_status: product.stock_status,
        is_public: product.is_public,
        options: product.options,
        variants: product.variants,
    };
}

export function entryToCatalogItem(entry: CatalogEntry & { id: string }): CatalogItem {
    return {
        id: entry.id,
        source: 'entry',
        sku: entry.slug,
        name: entry.title,
        description: entry.description || '',
        images: entry.images || [],
        image_thumbnails: entry.image_thumbnails,
        web_price: entry.web_price,
        purchase_mode: entry.purchase_mode || 'inquire',
        price_display: entry.price_display || 'quote',
        catalog_tags: entry.catalog_tags,
        use_cases: entry.use_cases,
        moq: entry.moq,
        lead_time_days: entry.lead_time_days,
        customizable: entry.customizable,
        catalog_featured: entry.catalog_featured,
        catalog_sort: entry.catalog_sort,
    };
}

export function formatCatalogPrice(item: CatalogItem): string {
    const price = item.promo_price && item.promo_price > 0 && item.promo_price < (item.web_price || 0)
        ? item.promo_price
        : item.web_price;

    switch (item.price_display) {
        case 'quote':
            return 'Quote on request';
        case 'hidden':
            return '';
        case 'from':
            return price ? `From RM ${price.toFixed(2)}` : 'From —';
        case 'fixed':
        default:
            return price ? `RM ${price.toFixed(2)}` : '';
    }
}

export const CATALOG_TAG_LABELS: Record<string, string> = {
    'custom-print': 'Custom Print',
    embroidery: 'Embroidery',
    bulk: 'Bulk',
    'event-merch': 'Event Merch',
    'door-gift': 'Door Gift',
    printing: 'Printing',
    corporate: 'Corporate',
};

export const WHATSAPP_NUMBER = '60135518857';

export function buildWhatsAppUrl(items: { name: string; sku: string; note?: string }[]): string {
    const lines = items.map((item, i) => {
        const note = item.note ? ` — ${item.note}` : '';
        return `${i + 1}. ${item.name} (SKU: ${item.sku})${note}`;
    });
    const text = `Hi Rud'Ark, I'm interested in the following items:\n\n${lines.join('\n')}\n\nPlease share pricing and availability.`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export function buildEmailUrl(items: { name: string; sku: string; note?: string }[]): string {
    const body = items.map((item, i) => {
        const note = item.note ? ` — ${item.note}` : '';
        return `${i + 1}. ${item.name} (SKU: ${item.sku})${note}`;
    }).join('%0D%0A');
    return `mailto:hello@rudark.my?subject=${encodeURIComponent('Catalog inquiry')}&body=${encodeURIComponent(`Hi, I would like to inquire about:\n\n${items.map((item, i) => `${i + 1}. ${item.name} (SKU: ${item.sku})${item.note ? ` — ${item.note}` : ''}`).join('\n')}`)}`;
}

export function buildShareUrl(skus: string[]): string {
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://rudark-web.vercel.app';
    return `${base}/catalog/share?items=${encodeURIComponent(skus.join(','))}`;
}
