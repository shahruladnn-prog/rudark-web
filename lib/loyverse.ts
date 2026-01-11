const LOYVERSE_API_URL = 'https://api.loyverse.com/v1.0';

export class LoyverseClient {
    private token: string;

    constructor() {
        this.token = process.env.LOYVERSE_API_TOKEN || '';
        if (!this.token) {
            console.warn('Loyverse API Token is missing!');
        }
    }

    private async fetch(endpoint: string, options: RequestInit = {}) {
        const url = `${LOYVERSE_API_URL}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Loyverse API Error [${response.status}]: ${body}`);
        }

        return response.json();
    }

    // Fetch all items (with variants), handling pagination automatically
    async getItems(limit = 250): Promise<{ items: any[] }> {
        let allItems: any[] = [];
        let cursor: string | undefined = undefined;

        do {
            let url = `/items?limit=${limit}`;
            if (cursor) url += `&cursor=${cursor}`;

            const response = await this.fetch(url);
            if (response.items) {
                allItems = allItems.concat(response.items);
            }
            cursor = response.cursor;
        } while (cursor);

        return { items: allItems };
    }

    // Fetch inventory levels for everything, handling pagination
    async getInventory(limit = 250): Promise<{ inventory_levels: any[] }> {
        let allInventory: any[] = [];
        let cursor: string | undefined = undefined;

        do {
            let url = `/inventory?limit=${limit}`;
            if (cursor) url += `&cursor=${cursor}`;

            const response = await this.fetch(url);
            if (response.inventory_levels) {
                allInventory = allInventory.concat(response.inventory_levels);
            }
            cursor = response.cursor;
        } while (cursor);

        return { inventory_levels: allInventory };
    }

    // Fetch Stores
    async getStores(): Promise<{ stores: any[] }> {
        const response = await this.fetch('/stores');
        return response; // Assumes response has { stores: [...] }
    }

    // Fetch Payment Types
    async getPaymentTypes(): Promise<{ payment_types: any[] }> {
        const response = await this.fetch('/payment_types');
        return response;
    }

    // Get specific variant inventory - useful for checks
    async getVariantInventory(variantIds: string[]) {
        // Loyverse inventory endpoint usually lists everything, filtering might need to happen app-side 
        // or we just fetch everything and map it. 
        // For efficiency in a real app, we might cache this or use webhooks if Loyverse supports them.
        // For now, we'll fetch all inventory (assuming small catalog) or specific logic if supported.
        // Loyverse API v1.0 /inventory returns a list.
        const data = await this.getInventory();
        // Simple logic: return matching levels
        return data.inventory_levels.filter((level: any) => variantIds.includes(level.variant_id));
    }

    async createReceipt(receiptData: any) {
        return this.fetch('/receipts', {
            method: 'POST',
            body: JSON.stringify(receiptData),
        });
    }

    /**
     * Adjust inventory level for a variant
     * @param variant_id - Loyverse variant ID
     * @param adjustment - Positive = add stock, Negative = deduct stock
     * @param reason - Reason for adjustment (optional)
     */
    async adjustInventory(params: {
        variant_id: string;
        adjustment: number;
        reason?: string;
    }) {
        console.log(`[Loyverse] Adjusting inventory: variant=${params.variant_id}, adjustment=${params.adjustment}`);

        const response = await this.fetch('/inventory', {
            method: 'POST',
            body: JSON.stringify({
                variant_id: params.variant_id,
                quantity_adjustment: params.adjustment,
                reason: params.reason || 'Stock adjustment'
            })
        });

        console.log(`[Loyverse] Inventory adjusted successfully`);
        return response;
    }
}

export const loyverse = new LoyverseClient();
