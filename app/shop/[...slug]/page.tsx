import type { Metadata } from 'next';
import { getProductsBySlug } from '@/actions/shop-actions';
import Link from 'next/link';
import ProductCard from '@/components/product-card';
import { Product } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http://localhost')
    ? 'https://rudark-web.vercel.app'
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://rudark-web.vercel.app');

export const revalidate = 3600;

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string[] }> }
): Promise<Metadata> {
    const { slug } = await params;
    const data = await getProductsBySlug(slug).catch(() => ({ categoryName: 'Shop', subcategoryName: null, products: [] as Product[] }));
    const subcatName = 'subcategoryName' in data ? (data.subcategoryName as string | null) : null;
    const title = subcatName ? `${data.categoryName} / ${subcatName}` : (data.categoryName || 'Shop');
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

    let data: any;
    try {
        data = await getProductsBySlug(slug);
    } catch {
        data = { categoryName: 'Shop', subcategoryName: null, products: [] };
    }

    const subcatName = 'subcategoryName' in data ? data.subcategoryName : null;
    const title = subcatName ? `${data.categoryName} / ${subcatName}` : (data.categoryName || 'Shop');
    const products: Product[] = data.products || [];

    if (products.length === 0) {
        return (
            <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-8 text-center bg-[url('/grid-mesh.svg')] bg-fixed">
                <h1 className="text-4xl font-condensed font-bold uppercase mb-4">{title}</h1>
                <p className="text-gray-400 font-mono mb-8">No tactical gear found in this sector.</p>
                <Link href="/" className="text-rudark-volt hover:underline uppercase text-sm tracking-widest font-bold">Return to Base</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-5xl md:text-7xl font-condensed font-bold uppercase mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tighter">
                    {title}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.sku || product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
}
