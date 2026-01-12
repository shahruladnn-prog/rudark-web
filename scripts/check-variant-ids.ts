// Quick diagnostic script to check if products have loyverse_variant_id
import { adminDb } from '../lib/firebase-admin';

async function checkProductVariantIds() {
    console.log('=== Checking Product Loyverse Variant IDs ===\n');

    const productsSnapshot = await adminDb.collection('products').limit(10).get();

    productsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`SKU: ${data.sku}`);
        console.log(`Name: ${data.name}`);
        console.log(`loyverse_variant_id: ${data.loyverse_variant_id || 'MISSING!'}`);
        console.log(`loyverse_item_id: ${data.loyverse_item_id || 'MISSING!'}`);
        console.log('---');
    });
}

checkProductVariantIds().catch(console.error);
