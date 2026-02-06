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

        // Get all products that match any of the SKUs
        const snapshot = await adminDb.collection('products').get();

        for (const doc of snapshot.docs) {
            const product = doc.data();

            // Check if main product SKU matches
            if (skus.includes(product.sku)) {
                stocks[product.sku] = (product.stock_quantity || 0) - (product.reserved_quantity || 0);
            }

            // Check variants
            if (product.variants && Array.isArray(product.variants)) {
                for (const variant of product.variants) {
                    if (skus.includes(variant.sku)) {
                        const available = (variant.stock_quantity || 0) - (variant.reserved_quantity || 0);
                        stocks[variant.sku] = Math.max(0, available);
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
