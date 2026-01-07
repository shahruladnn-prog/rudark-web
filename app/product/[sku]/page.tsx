import { adminDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { notFound } from 'next/navigation';
import AddToCartButton from '@/components/add-to-cart-button';

export const dynamic = 'force-dynamic';

async function getProduct(sku: string) {
    try {
        const productsRef = adminDb.collection('products');
        const snapshot = await productsRef.where('sku', '==', sku).limit(1).get();

        if (snapshot.empty) return null;

        const data = snapshot.docs[0].data();
        return {
            id: snapshot.docs[0].id,
            sku: data.sku,
            name: data.name,
            web_price: data.web_price,
            description: data.description,
            images: data.images,
            category: data.category,
            stock_status: data.stock_status,
            loyverse_item_id: data.loyverse_item_id,
            loyverse_variant_id: data.loyverse_variant_id
        } as Product;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
    const { sku } = await params;
    const product = await getProduct(sku);

    if (!product) {
        notFound();
    }

    const isOutOfStock = product.stock_status === 'OUT';

    return (
        <div className="min-h-screen bg-rudark-matte text-white py-12 px-4 md:px-8">
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
                            <div className={`absolute top-4 left-4 px-3 py-1 text-sm font-bold uppercase tracking-wider z-20 ${isOutOfStock ? 'bg-red-600 text-white' : 'bg-orange-500 text-black'
                                }`}>
                                {isOutOfStock ? 'Sold Out' : 'Low Stock'}
                            </div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                        <div className="mb-2 text-sm text-rudark-volt font-mono tracking-[0.2em] uppercase">
              // {product.category || 'Gear'}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-condensed font-bold text-white mb-4 uppercase leading-none">
                            {product.name}
                        </h1>

                        <div className="text-3xl font-condensed font-bold text-white mb-8 border-b border-rudark-grey/30 pb-4 inline-block">
                            RM {product.web_price.toFixed(2)}
                        </div>

                        <div className="prose prose-invert prose-p:text-gray-400 prose-p:font-light prose-headings:font-condensed prose-headings:uppercase mb-8 max-w-none">
                            {/* Render markdown description logic usually goes here, simplified for now */}
                            <div className="whitespace-pre-line leading-relaxed">
                                {product.description || "No description available."}
                            </div>
                        </div>

                        <div className="mt-auto pt-8 border-t border-rudark-grey/30">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 text-xs font-mono text-gray-500 mb-2 uppercase">
                                    <span>SKU: {product.sku}</span>
                                    <span>|</span>
                                    <span>Status: <span className={isOutOfStock ? "text-red-500" : "text-rudark-volt"}>{product.stock_status}</span></span>
                                </div>

                                <AddToCartButton product={product} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
