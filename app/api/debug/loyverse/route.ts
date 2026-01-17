import { NextRequest, NextResponse } from 'next/server';
import { loyverse } from '@/lib/loyverse';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Debug endpoint to check Loyverse items and order data
 * GET /api/debug/loyverse?orderId=ORD-xxx
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const searchSku = searchParams.get('sku'); // Optional: search for specific SKU

    try {
        // Get Loyverse items
        console.log('[Debug] Fetching Loyverse items...');
        const loyverseResponse = await loyverse.getItems();
        const loyverseItems = loyverseResponse.items || [];
        console.log(`[Debug] Fetched ${loyverseItems.length} items from Loyverse`);

        // Extract all SKUs from Loyverse (including deleted info)
        const loyverseSkus = loyverseItems.flatMap((item: any) =>
            item.variants?.map((v: any) => ({
                item_name: item.item_name,
                item_id: item.id,
                is_deleted: item.deleted_at ? true : false,
                variant_id: v.variant_id,
                sku: v.sku,
                option1_value: v.option1_value,
                option2_value: v.option2_value
            })) || []
        );

        // Check if specific SKU exists
        let skuMatch = null;
        if (searchSku) {
            skuMatch = loyverseSkus.find((s: any) => s.sku === searchSku);
        }

        let orderData = null;
        if (orderId) {
            const orderDoc = await adminDb.collection('orders').doc(orderId).get();
            if (orderDoc.exists) {
                const order = orderDoc.data();
                orderData = {
                    orderId,
                    items: order?.items?.map((item: any) => ({
                        name: item.name,
                        sku: item.sku,
                        variant_sku: item.variant_sku,
                        product_id: item.product_id,
                        loyverse_variant_id: item.loyverse_variant_id,
                        selected_options: item.selected_options
                    }))
                };

                // Check if order SKUs exist in Loyverse
                if (orderData.items) {
                    for (const item of orderData.items) {
                        const foundSku = loyverseSkus.find((s: any) =>
                            s.sku === item.sku || s.sku === item.variant_sku
                        );
                        (item as any).loyverse_match = foundSku ? {
                            found: true,
                            variant_id: foundSku.variant_id,
                            item_name: foundSku.item_name
                        } : { found: false };
                    }
                }
            }
        }

        // All SKUs sorted
        const allSkusSorted = loyverseSkus
            .map((s: any) => s.sku)
            .filter(Boolean)
            .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));

        return NextResponse.json({
            success: true,
            loyverse_item_count: loyverseItems.length,
            loyverse_total_variants: loyverseSkus.length,
            all_skus_sorted: allSkusSorted,
            sku_search_result: skuMatch,
            order_data: orderData,
            sample_items: loyverseItems.slice(0, 5).map((i: any) => ({
                name: i.item_name,
                id: i.id,
                deleted_at: i.deleted_at,
                variants: i.variants?.map((v: any) => ({ sku: v.sku, variant_id: v.variant_id }))
            }))
        });

    } catch (error: any) {
        console.error('[Debug] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
