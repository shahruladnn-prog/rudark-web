'use client';

import { useState } from 'react';
import { Product } from '@/types';
import ProductDetails from './product-details';

interface Props {
    product: Product;
    variantStock: Record<string, number>;
}

export default function ProductGalleryDetails({ product, variantStock }: Props) {
    // null = show the full product gallery; string = show this specific variant image first
    const [variantImage, setVariantImage] = useState<string | null>(null);

    // Build the image list: variant image first if selected, then the rest
    const images = product.images || [];
    const displayImages = variantImage
        ? [variantImage, ...images.filter(img => img !== variantImage)]
        : images;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">

            {/* Image Gallery */}
            <div className="bg-black/40 relative h-full min-h-[400px] overflow-hidden group">
                {displayImages.length > 0 ? (
                    <>
                        <div className="flex overflow-x-auto snap-x snap-mandatory h-full w-full scrollbar-hide">
                            {displayImages.map((img, index) => (
                                <div key={img + index} className="flex-shrink-0 w-full h-full snap-center relative">
                                    <img
                                        src={img}
                                        alt={`${product.name} - View ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>

                        {displayImages.length > 1 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                                {displayImages.map((_, idx) => (
                                    <div key={idx} className="w-2 h-2 rounded-full bg-white/50 backdrop-blur-sm" />
                                ))}
                            </div>
                        )}

                        {displayImages.length > 1 && (
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

            {/* Product Details + Variant Selector */}
            <div className="p-8 md:p-12">
                <ProductDetails
                    product={product}
                    variantStock={variantStock}
                    onVariantImageChange={setVariantImage}
                />
            </div>
        </div>
    );
}
