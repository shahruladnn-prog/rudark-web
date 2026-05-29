import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/stock?skus=10001,10002,10003
 * 
 * Fetches stock quantities for given SKUs from Firebase.
 * Used for client-side stock display to enable ISR caching on product pages.
 */
export async function GET(req: NextRequest) {
    try {
        const skusParam = req.nextUrl.searchParams.get('skus');

        if (!skusParam) {
            return NextResponse.json({ error: 'skus parameter required' }, { status: 400 });
        }

        const skus = skusParam.split(',').map(s => s.trim()).filter(Boolean);

        if (skus.length === 0) {
            return NextResponse.json({ stocks: {} });
        }

        // Query products by SKU
        const stocks: Record<string, number> = {};

        // Helper to chunk arrays
        const chunkArray = (arr: string[], size: number) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );

        // Firestore 'in' queries are limited to 30 items
        const skuChunks = chunkArray(skus, 30);

        for (const chunk of skuChunks) {
            // Query parent SKUs
            const snapshot = await adminDb.collection('products')
                .where('sku', 'in', chunk)
                .get();

            for (const doc of snapshot.docs) {
                const product = doc.data();
                if (skus.includes(product.sku)) {
                    stocks[product.sku] = Math.max(0, (product.stock_quantity || 0) - (product.reserved_quantity || 0));
                }
            }
        }

        // Look up variant SKUs for any not found as parent products
        const missingSkus = skus.filter(s => typeof stocks[s] === 'undefined');

        if (missingSkus.length > 0) {
            // Primary: query via variant_skus index (fast, populated on save)
            const variantSkuChunks = chunkArray(missingSkus, 30);
            for (const chunk of variantSkuChunks) {
                const snapshot = await adminDb.collection('products')
                    .where('variant_skus', 'array-contains-any', chunk)
                    .get();
                for (const doc of snapshot.docs) {
                    const product = doc.data();
                    for (const variant of (product.variants || [])) {
                        if (missingSkus.includes(variant.sku)) {
                            stocks[variant.sku] = Math.max(0, (variant.stock_quantity || 0) - (variant.reserved_quantity || 0));
                        }
                    }
                }
            }

            // Fallback: scan all products for any still-missing SKUs
            // (covers manually-created products before variant_skus field was added)
            const stillMissing = missingSkus.filter(s => typeof stocks[s] === 'undefined');
            if (stillMissing.length > 0) {
                const allSnap = await adminDb.collection('products').get();
                for (const doc of allSnap.docs) {
                    const product = doc.data();
                    for (const variant of (product.variants || [])) {
                        if (stillMissing.includes(variant.sku)) {
                            stocks[variant.sku] = Math.max(0, (variant.stock_quantity || 0) - (variant.reserved_quantity || 0));
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            stocks,
            cached_at: new Date().toISOString()
        }, {
            headers: {
                // Cache for 30 seconds at edge, allow stale for 5 minutes
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300'
            }
        });

    } catch (error: any) {
        console.error('[Stock API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stock', details: error?.message },
            { status: 500 }
        );
    }
}
