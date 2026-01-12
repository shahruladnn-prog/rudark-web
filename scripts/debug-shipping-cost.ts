import { adminDb } from '../lib/firebase-admin';

async function debugShippingCost() {
    try {
        // Get the most recent order
        const ordersSnapshot = await adminDb.collection('orders')
            .orderBy('created_at', 'desc')
            .limit(5)
            .get();

        console.log(`\n=== RECENT ORDERS DEBUG ===\n`);

        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Order ID: ${doc.id}`);
            console.log(`  Status: ${data.status}`);
            console.log(`  shipping_cost (raw): ${data.shipping_cost}`);
            console.log(`  shipping_cost (type): ${typeof data.shipping_cost}`);
            console.log(`  shipping_cost (Number): ${Number(data.shipping_cost || 0)}`);
            console.log(`  total_amount: ${data.total_amount}`);
            console.log(`  subtotal: ${data.subtotal}`);
            console.log(`---`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

debugShippingCost();
