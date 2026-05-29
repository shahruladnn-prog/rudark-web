import type { Metadata } from 'next';
import { getProductsBySlug } from '@/actions/shop-actions';
import { getCategories } from '@/actions/category-actions';
import { Product } from '@/types';
import ShopClient from '../shop-client';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http://localhost')
    ? 'https://rudark-web.vercel.app'
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://rudark-web.vercel.app');

export const revalidate = 3600;

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string[] }> }
): Promise<Metadata> {
    const { slug } = await params;
    const data = await getProductsBySlug(slug).catch(() => ({
        categoryName: 'Shop',
        subcategoryName: null,
        products: [] as Product[],
    }));
    const subcatName = 'subcategoryName' in data ? (data.subcategoryName as string | null) : null;
    const title = subcatName
        ? `${data.categoryName} / ${subcatName}`
        : (data.categoryName || 'Shop');
    const description = `Browse ${title} — premium technical gear at Rud'Ark PRO SHOP.`;

    return {
        title: `${title} | Rud'Ark PRO SHOP`,
        description,
        openGraph: {
            title: `${title} | Rud'Ark PRO SHOP`,
            description,
            url: `${BASE_URL}/shop/${slug.join('/')}`,
            siteName: "Rud'Ark",
            images: [{ url: `${BASE_URL}/logo.png`, width: 800, height: 800, alt: "Rud'Ark Logo" }],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${title} | Rud'Ark PRO SHOP`,
            description,
            images: [`${BASE_URL}/logo.png`],
        },
    };
}

export default async function ShopCategoryPage(
    { params }: { params: Promise<{ slug: string[] }> }
) {
    const { slug } = await params;

    const [data, categories] = await Promise.all([
        getProductsBySlug(slug).catch(() => ({
            categoryName: 'Shop',
            subcategoryName: null,
            subcategories: [],
            products: [] as Product[],
        })),
        getCategories(),
    ]);

    const subcatName = 'subcategoryName' in data ? (data.subcategoryName as string | null) : null;
    const products: Product[] = (data as any).products || [];

    return (
        <ShopClient
            initialProducts={products}
            allCategories={categories as any[]}
            activeCategory={slug[0]}
            activeSubcategory={slug[1] || undefined}
            categoryName={data.categoryName || slug[0]}
            subcategoryName={subcatName || undefined}
        />
    );
}
