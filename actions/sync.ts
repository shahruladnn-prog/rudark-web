'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';

// Placeholder for actual Loyverse API call
// In a real scenario, this would import `getInventory` from '@/lib/loyverse'
async function fetchLoyverseInventory() {
    // START MOCK DATA FOR DEMONSTRATION
    return [
        { sku: 'KAYAK-FISHING-01', name: 'RudArk Predator 13', stock_level: 5, id: 'LV-001', variant_id: 'VAR-001' },
        { sku: 'PFD-TAC-01', name: 'Tactical Vest Gen 2', stock_level: 12, id: 'LV-002', variant_id: 'VAR-002' },
        { sku: 'PADDLE-CARB-01', name: 'Carbon Stryker Paddle', stock_level: 0, id: 'LV-003', variant_id: 'VAR-003' },
        // New item example
        { sku: 'NEW-ARRIVAL-01', name: 'Abyss Diver Watch', stock_level: 10, id: 'LV-004', variant_id: 'VAR-004' }
    ];
    // END MOCK DATA
}

export async function syncInventory() {
    try {
        const loyverseItems = await fetchLoyverseInventory();
        const batch = adminDb.batch();
        const productsRef = adminDb.collection('products');

        // 1. Get all existing products from Firestore to create a Map
        const snapshot = await productsRef.get();
        const existingProductsMap = new Map<string, FirebaseFirestore.DocumentReference>();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.sku) {
                existingProductsMap.set(data.sku, doc.ref);
            }
        });

        let stats = { updated: 0, created: 0, unchanged: 0 };

        for (const item of loyverseItems) {
            const existingRef = existingProductsMap.get(item.sku);

            // Calculate Stock Status
            const status = item.stock_level > 5 ? 'IN_STOCK' : item.stock_level > 0 ? 'LOW' : 'OUT';

            if (existingRef) {
                // EXISTING: Update ONLY operational data (Stock, ID)
                // We DO NOT touch Name, Desc, Price, Images etc.
                batch.update(existingRef, {
                    stock_status: status,
                    loyverse_id: item.id,
                    loyverse_variant_id: item.variant_id,
                    last_synced: new Date().toISOString()
                });
                stats.updated++;
            } else {
                // NEW: Create as DRAFT
                // Needs admin attention to add content
                const newDocRef = productsRef.doc();
                batch.set(newDocRef, {
                    name: item.name, // Use Loyverse name as starting point
                    sku: item.sku,
                    stock_status: status,
                    loyverse_id: item.id,
                    loyverse_variant_id: item.variant_id,
                    web_price: 0, // Admin must set price
                    description: 'Imported from Loyverse. Needs review.',
                    images: [],
                    category_slug: 'uncategorized',
                    subcategory_slug: '',
                    is_featured: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                stats.created++;
            }
        }

        await batch.commit();
        return { success: true, stats };

    } catch (error) {
        console.error('Hybrid Sync Failed:', error);
        return { success: false, error: 'Sync failed' };
    }
}
