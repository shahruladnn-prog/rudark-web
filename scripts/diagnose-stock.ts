import { adminDb } from './lib/firebase-admin';
import { loyverse } from './lib/loyverse';

async function diagnoseStockIssue() {
    console.log('=== STOCK DIAGNOSTIC ===\n');

    // 1. Check Firebase Products
    console.log('1. Checking Firebase Products...');
    const productsSnapshot = await adminDb.collection('products').limit(3).get();

    productsSnapshot.docs.forEach((doc, idx) => {
        const product = doc.data();
        console.log(`\nProduct ${idx + 1}:`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  SKU: ${product.sku}`);
        console.log(`  Name: ${product.name}`);
        console.log(`  loyverse_variant_id: ${product.loyverse_variant_id || 'MISSING!'}`);
        console.log(`  stock_quantity: ${product.stock_quantity ?? 'undefined'}`);
        console.log(`  reserved_quantity: ${product.reserved_quantity ?? 'undefined'}`);
        console.log(`  Has variants: ${product.variants?.length || 0}`);

        if (product.variants && product.variants.length > 0) {
            console.log(`  First variant SKU: ${product.variants[0].sku}`);
        }
    });

    // 2. Check Loyverse Inventory
    console.log('\n\n2. Checking Loyverse Inventory...');
    const inventoryData = await loyverse.getInventory();
    console.log(`  Total inventory items: ${inventoryData.inventory_levels?.length || 0}`);

    if (inventoryData.inventory_levels && inventoryData.inventory_levels.length > 0) {
        console.log(`\n  Sample inventory items:`);
        inventoryData.inventory_levels.slice(0, 3).forEach((inv: any, idx: number) => {
            console.log(`    ${idx + 1}. variant_id: ${inv.variant_id}, in_stock: ${inv.in_stock}`);
        });
    }

    // 3. Check Loyverse Items (to get variant IDs)
    console.log('\n\n3. Checking Loyverse Items...');
    const itemsData = await loyverse.getItems();
    console.log(`  Total items: ${itemsData.items?.length || 0}`);

    if (itemsData.items && itemsData.items.length > 0) {
        console.log(`\n  Sample item with variants:`);
        const sampleItem = itemsData.items[0];
        console.log(`    Item: ${sampleItem.item_name}`);
        console.log(`    Variants: ${sampleItem.variants?.length || 0}`);

        if (sampleItem.variants && sampleItem.variants.length > 0) {
            sampleItem.variants.slice(0, 3).forEach((variant: any, idx: number) => {
                console.log(`      ${idx + 1}. SKU: ${variant.sku}, variant_id: ${variant.variant_id}`);
            });
        }
    }

    console.log('\n=== END DIAGNOSTIC ===');
}

diagnoseStockIssue().catch(console.error);
