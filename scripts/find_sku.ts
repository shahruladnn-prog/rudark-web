import { config } from 'dotenv';
config({ path: '.env.local' });
import { LoyverseClient } from '../lib/loyverse';

async function main() {
    try {
        console.log("Searching for SKU 10071...");
        // Re-instantiate to ensure env vars are picked up
        const client = new LoyverseClient();
        const { items } = await client.getItems();
        const item = items.find(i => i.variants.some((v: any) => v.sku === '10071'));
        if (item) {
            const variant = item.variants.find((v: any) => v.sku === '10071');
            console.log('FOUND:', variant.variant_id);
        } else {
            console.log('NOT FOUND');
        }
    } catch (e) {
        console.error(e);
    }
}
main();
