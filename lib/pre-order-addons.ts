// Optional accessories offered alongside a pre-order. Shared between the
// customer-facing form (for display) and the server action (as priced truth —
// the client never gets to dictate a price, only a quantity).
export const PRE_ORDER_ADDONS = [
    { id: 'life_jacket', name: 'Life Jacket', price: 300, normalPrice: 380 },
    { id: 'helmet', name: 'Helmet', price: 120, normalPrice: 150 },
    { id: 'paddle', name: 'Paddle', price: 120, normalPrice: 180 },
    { id: 'custom_patch', name: 'Custom Logo Rubber Patch', price: 100, normalPrice: null as number | null, moldFee: 500 },
] as const;

export interface AddonLine {
    sku: string;
    name: string;
    quantity: number;
    web_price: number;
}

// Single source of truth for add-on pricing — used by both the customer-facing
// live price preview and the server action's authoritative charge, so the two
// can never silently disagree. The custom logo patch mold fee is a flat
// one-time charge per order, not multiplied by piece count.
export function priceAddonLines(quantities: Record<string, number>): AddonLine[] {
    const lines: AddonLine[] = [];

    for (const addon of PRE_ORDER_ADDONS) {
        const qty = Math.max(0, quantities[addon.id] || 0);
        if (qty <= 0) continue;

        if (addon.id === 'custom_patch') {
            lines.push({
                sku: 'ADDON-MOLD-FEE',
                name: 'Custom Logo Rubber Patch — Mold Fee (one-time)',
                quantity: 1,
                web_price: addon.moldFee,
            });
            lines.push({
                sku: 'ADDON-CUSTOM-PATCH',
                name: addon.name,
                quantity: qty,
                web_price: addon.price,
            });
        } else {
            lines.push({
                sku: `ADDON-${addon.id.toUpperCase()}`,
                name: addon.name,
                quantity: qty,
                web_price: addon.price,
            });
        }
    }

    return lines;
}

export function priceAddonsSubtotal(quantities: Record<string, number>): number {
    return priceAddonLines(quantities).reduce((sum, line) => sum + line.web_price * line.quantity, 0);
}
