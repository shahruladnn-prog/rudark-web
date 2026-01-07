'use server';

import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';

export async function seedSampleData() {
    const samples: Product[] = [
        {
            sku: 'RA-KAYAK-001',
            name: "RudArk Expedition Kayak (Single)",
            web_price: 1499.00,
            description: "## Conquer the Rivers\n\nOur flagship single-seater kayak designed for stability and speed. Perfect for Malaysian rivers and coastal waters.\n\n*   **Material**: High-Density Polyethylene\n*   **Weight**: 22kg\n*   **Length**: 3.5m\n*   **Includes**: Paddle and seat",
            images: ["https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=800&q=80"],
            category: "Kayaks",
            stock_status: 'IN_STOCK'
        },
        {
            sku: 'RA-VEST-PRO',
            name: "Pro-Flow Life Jacket (Red)",
            web_price: 189.00,
            description: "Standard safety vest with high buoyancy. Essential for all water activities.",
            images: ["https://images.unsplash.com/photo-1544265436-b6eb9a68cc53?auto=format&fit=crop&w=800&q=80"],
            category: "Safety Gear",
            stock_status: 'IN_STOCK'
        },
        {
            sku: 'RA-PADDLE-CF',
            name: "Carbon Fiber Touring Paddle",
            web_price: 350.00,
            description: "Ultra-lightweight paddle for long-distance touring. Reduces fatigue and maximizes stroke power.",
            images: ["https://images.unsplash.com/photo-1588656753457-4148e91dcbe9?auto=format&fit=crop&w=800&q=80"],
            category: "Accessories",
            stock_status: 'LOW'
        },
        {
            sku: 'RA-DRYBAG-20L',
            name: "RudArk Dry Bag 20L",
            web_price: 45.00,
            description: "Keep your valuables 100% dry. Heavy-duty waterproof material.",
            images: ["https://images.unsplash.com/photo-1623910398638-316496464522?auto=format&fit=crop&w=800&q=80"],
            category: "Accessories",
            stock_status: 'IN_STOCK'
        },
        {
            sku: 'RA-SNORKEL-SET',
            name: "Premium Snorkel Set",
            web_price: 99.00,
            description: "Anti-fog mask and dry-top snorkel. Explore the underwater world clearly.",
            images: ["https://images.unsplash.com/photo-1571527581024-814d24597405?auto=format&fit=crop&w=800&q=80"],
            category: "Swimming",
            stock_status: 'OUT'
        }
    ];

    const batch = adminDb.batch();

    for (const product of samples) {
        const ref = adminDb.collection('products').doc(); // Auto-ID
        // Check if distinct SKU exists to avoid dupes? 
        // For seeding, we'll just overwrite if we find SKU, or create new.
        // Let's do a simple heuristic: seed always adds, but let's try not to spam.

        // Actually, let's just create them. If user clicks twice, they get duplicates unless we check.
        // Better DX: distinct by SKU.
        const q = await adminDb.collection('products').where('sku', '==', product.sku).get();

        if (q.empty) {
            batch.set(ref, {
                ...product,
                created_at: new Date(),
                updated_at: new Date()
            });
        } else {
            // Update existing sample
            batch.update(q.docs[0].ref, {
                ...product, // Reset to sample data
                updated_at: new Date()
            });
        }
    }

    await batch.commit();
    return { success: true, count: samples.length };
}
