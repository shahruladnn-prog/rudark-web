import { Product, ProductVariant } from '@/types';

// Shared by the pre-order server action and the pre-order gallery (client) so
// variant resolution can never disagree between what's displayed and what's charged.
export function matchVariant(product: Product, selectedOptions?: Record<string, string> | null): ProductVariant | undefined {
    if (!selectedOptions || !product.variants?.length) return undefined;
    return product.variants
        .filter(v => v.stock_status !== 'ARCHIVED')
        .find(v => v.options && Object.entries(v.options).every(([k, val]) => selectedOptions[k] === val));
}

// Mirrors lib/catalog-utils.ts's formatCatalogPrice validation rule (promo price
// only wins if it's actually a real discount), returned as a number instead of
// a formatted display string.
export function validPrice(basePrice: number, promoPrice?: number): number {
    return promoPrice && promoPrice > 0 && promoPrice < basePrice ? promoPrice : basePrice;
}
