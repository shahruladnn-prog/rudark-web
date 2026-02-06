import { adminDb } from '@/lib/firebase-admin';
import { serializeDoc } from '@/lib/serialize-firestore';
import { Product } from '@/types';
import { notFound } from 'next/navigation';
import ProductDetails from '@/components/product-details';

export const revalidate = 300; // ISR: Refresh every 5 minutes

async function getProduct(sku: string) {
    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.where('sku', '==', sku).limit(1).get();

        if (snapshot.empty) return null;

        return serializeDoc<Product>(snapshot.docs[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// Get stock from Firebase product data (no external API calls)
// Fresh stock is fetched client-side via /api/stock for real-time updates
function getVariantStock(product: Product): Record<string, number> {
    try {
        const variantStock: Record<string, number> = {};

        if (product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
                // Use Firebase stock data (synced from Loyverse)
                const available = (variant.stock_quantity || 0) - (variant.reserved_quantity || 0);
                variantStock[variant.sku] = Math.max(0, available);
            }
        }

        return variantStock;
    } catch (error) {
        console.error('Error getting variant stock:', error);
        return {};
    }
}

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
    const { sku } = await params;
    const product = await getProduct(sku);

    if (!product) {
        notFound();
    }

    // Get initial stock from Firebase data (client-side will fetch fresh data)
    const variantStock = getVariantStock(product);

    const isOutOfStock = product.stock_status === 'OUT';

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-6xl mx-auto bg-rudark-carbon rounded-sm shadow-xl overflow-hidden border border-rudark-grey/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">

                    {/* Image Section */}
                    <div className="bg-black/40 relative h-full min-h-[400px] overflow-hidden group">
                        {product.images && product.images.length > 0 ? (
                            <>
                                {/* Carousel Container */}
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

                                {/* Image Indicators (only if > 1 image) */}
                                {product.images.length > 1 && (
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                                        {product.images.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className="w-2 h-2 rounded-full bg-white/50 backdrop-blur-sm"
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Hint for scroll (Mobile) */}
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
                            <div className={`absolute top-4 left-4 px-3 py-1 text-sm font-bold uppercase tracking-wider z-20 ${product.stock_status === 'OUT' ? 'bg-red-600 text-white' :
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
        </div>
    );
}
