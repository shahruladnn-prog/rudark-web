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

        // To support variant SKUs, we check missing SKUs against products that might have them.
        // DANGER: We must NOT do a full collection scan here as it's a DoS vector.
        // We will attempt a more targeted query for missing SKUs.
        const missingSkus = skus.filter(s => typeof stocks[s] === 'undefined');
        
        if (missingSkus.length > 0) {
            // OPTIMIZATION: Instead of scanning everything, we search by variant_skus array
            // This assumes the product documents have a 'variant_skus' string array field.
            // If they don't, we should add one during sync.
            const variantSkuChunks = chunkArray(missingSkus, 30);
            
            for (const chunk of variantSkuChunks) {
                const snapshot = await adminDb.collection('products')
                    .where('variant_skus', 'array-contains-any', chunk)
                    .get();
                    
                for (const doc of snapshot.docs) {
                    const product = doc.data();
                    if (product.variants && Array.isArray(product.variants)) {
                        for (const variant of product.variants) {
                            if (missingSkus.includes(variant.sku)) {
                                const available = (variant.stock_quantity || 0) - (variant.reserved_quantity || 0);
                                stocks[variant.sku] = Math.max(0, available);
                            }
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
