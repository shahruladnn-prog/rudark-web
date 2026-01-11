import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Dynamic imports to ensure env is loaded first
async function verifyProductData() {
    const { adminDb } = await import('../lib/firebase-admin');
    const { checkStock } = await import('./stock-actions');

    console.log("Verifying Product Data for SKU: 10013");

    // Check Env
    console.log("Token Loaded:", process.env.LOYVERSE_API_TOKEN ? "YES (First 5 chars: " + process.env.LOYVERSE_API_TOKEN.substring(0, 5) + ")" : "NO");

    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.where('sku', '==', '10013').get();

        if (snapshot.empty) {
            console.log("No product found with SKU 10013");
        } else {
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`Product Found in DB: ${doc.id}`);
                console.log("SKU:", data.sku);
                console.log("Loyverse Variant ID:", data.loyverse_variant_id);
                console.log("Options:", JSON.stringify(data.options, null, 2));
                console.log("Variants Count:", data.variants ? data.variants.length : 0);
                if (data.variants) {
                    console.log("Sample Variants:", JSON.stringify(data.variants.slice(0, 3), null, 2));
                }
            });
        }
    } catch (error) {
        console.error("Error fetching Firestore product:", error);
    }

    console.log("\n--- Testing checkStock Action ---");
    try {
        const stockResult = await checkStock("10013", undefined);
        console.log("checkStock Result:", JSON.stringify(stockResult, null, 2));
    } catch (e) {
        console.error("checkStock failed:", e);
    }
}

verifyProductData();
