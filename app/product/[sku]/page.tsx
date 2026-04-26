import { adminDb } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serialize-firestore';
import { Product } from '@/types';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Metadata } from 'next';
import ProductDetails from '@/components/product-details';
import NewsletterForm from '@/components/newsletter-form';
import ReviewForm from '@/components/review-form';
import ReviewList from '@/components/review-list';

// Safety-net ISR: fall back to at most 1-hour stale if revalidatePath() is never called
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL?.startsWith('http://localhost')
    ? 'https://rudark-web.vercel.app'
    : (process.env.NEXT_PUBLIC_BASE_URL || 'https://rudark-web.vercel.app');

const getProduct = cache(async (sku: string): Promise<Product | null> => {
    try {
        const snapshot = await adminDb
            .collection('products')
            .where('sku', '==', sku)
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        return serializeDoc<Product>(snapshot.docs[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
});

export async function generateMetadata(
    { params }: { params: Promise<{ sku: string }> }
): Promise<Metadata> {
    const { sku } = await params;
    const product = await getProduct(sku);

    if (!product) {
        return { title: "Product Not Found | Rud'Ark PRO SHOP" };
    }

    const rawDesc = product.description?.replace(/\n+/g, ' ').trim() || '';
    const description = rawDesc.length > 155 ? rawDesc.slice(0, 155) + '…' : rawDesc || "Premium technical gear at Rud'Ark PRO SHOP.";
    const imageUrl = product.images?.find(img => img.startsWith('http')) || `${BASE_URL}/logo.png`;
    const price = product.promo_price || product.web_price;

    return {
        title: `${product.name} | Rud'Ark PRO SHOP`,
        description,
        openGraph: {
            title: product.name,
            description,
            url: `${BASE_URL}/product/${sku}`,
            siteName: "Rud'Ark PRO SHOP",
            images: [{ url: imageUrl, width: 800, height: 1000, alt: product.name }],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description,
            images: [imageUrl],
        },
    };
}

function getVariantStock(product: Product): Record<string, number> {
    try {
        const variantStock: Record<string, number> = {};
        if (product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
                const available = (variant.stock_quantity || 0) - (variant.reserved_quantity || 0);
                variantStock[variant.sku] = Math.max(0, available);
            }
        }
        return variantStock;
    } catch {
        return {};
    }
}

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
    const { sku } = await params;
    const product = await getProduct(sku);

    if (!product) notFound();

    const variantStock = getVariantStock(product);
    const price = product.promo_price || product.web_price;

    const jsonLd = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        sku: product.sku,
        image: product.images?.filter(img => img.startsWith('http')),
        brand: { '@type': 'Brand', name: "Rud'Ark" },
        offers: {
            '@type': 'Offer',
            url: `${BASE_URL}/product/${sku}`,
            priceCurrency: 'MYR',
            price: price.toFixed(2),
            availability: product.stock_status === 'OUT'
                ? 'https://schema.org/OutOfStock'
                : 'https://schema.org/InStock',
            seller: { '@type': 'Organization', name: "Rud'Ark PRO SHOP" },
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
                <div className="max-w-6xl mx-auto bg-rudark-carbon rounded-sm shadow-xl overflow-hidden border border-rudark-grey/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">

                        {/* Image Section */}
                        <div className="bg-black/40 relative h-full min-h-[400px] overflow-hidden group">
                            {product.images && product.images.length > 0 ? (
                                <>
                                    <div className="flex overflow-x-auto snap-x snap-mandatory h-full w-full scrollbar-hide">
                                        {product.images.map((img, index) => (
                                            <div key={index} className="flex-shrink-0 w-full h-full snap-center relative">
                                                <img
                                                    src={img}
                                                    alt={`${product.name} - View ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {product.images.length > 1 && (
                                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                                            {product.images.map((_, idx) => (
                                                <div key={idx} className="w-2 h-2 rounded-full bg-white/50 backdrop-blur-sm" />
                                            ))}
                                        </div>
                                    )}

                                    {product.images.length > 1 && (
                                        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/50 to-transparent pointer-events-none md:hidden flex items-center justify-end pr-2 opacity-50">
                                            <span className="text-white text-xl">›</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-gray-500 font-condensed tracking-wider">
                                    NO IMAGE AVAILABLE
                                </div>
                            )}

                            {product.stock_status !== 'IN_STOCK' && (
                                <div className={`absolute top-4 left-4 px-3 py-1 text-sm font-bold uppercase tracking-wider z-20 ${
                                    product.stock_status === 'OUT' ? 'bg-red-600 text-white' :
                                    product.stock_status === 'CONTACT_US' ? 'bg-blue-600 text-white' :
                                    'bg-orange-500 text-black'
                                }`}>
                                    {product.stock_status === 'OUT' ? 'Sold Out' :
                                     product.stock_status === 'CONTACT_US' ? 'Contact Us' :
                                     'Low Stock'}
                                </div>
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="p-8 md:p-12">
                            <ProductDetails product={product} variantStock={variantStock} />
                        </div>

                    </div>
                </div>

                <div className="max-w-6xl mx-auto mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <ReviewList productSku={sku} />
                    <ReviewForm productSku={sku} />
                </div>

                <div className="max-w-6xl mx-auto mt-12">
                    <NewsletterForm source={`product_${sku}`} />
                </div>
            </div>
        </>
    );
}
