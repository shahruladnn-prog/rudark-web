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

    // Fetch all items (with variants) to get details like Name, ID, SKU
    async getItems(limit = 250, cursor?: string): Promise<{ items: any[], cursor?: string }> {
        let url = `/items?limit=${limit}`;
        if (cursor) url += `&cursor=${cursor}`;
        return this.fetch(url);
    }

    // Fetch inventory levels for everything (needs mapping to items)
    async getInventory(limit = 250, cursor?: string): Promise<{ inventory_levels: any[], cursor?: string }> {
        let url = `/inventory?limit=${limit}`;
        if (cursor) url += `&cursor=${cursor}`;
        return this.fetch(url);
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
            body: JSON.stringify(receiptData)
        });
    }
}

export const loyverse = new LoyverseClient();
