import { NextRequest, NextResponse } from 'next/server';
import { getCatalogItemsBySkus } from '@/actions/catalog-actions';

export async function GET(request: NextRequest) {
    const skusParam = request.nextUrl.searchParams.get('skus') || '';
    const skus = skusParam.split(',').map(s => s.trim()).filter(Boolean);

    if (!skus.length) {
        return NextResponse.json({ items: [] });
    }

    const items = await getCatalogItemsBySkus(skus);
    return NextResponse.json({ items });
}
