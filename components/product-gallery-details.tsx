'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Product } from '@/types';
import ProductDetails from './product-details';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

interface Props {
    product: Product;
    variantStock: Record<string, number>;
}

export default function ProductGalleryDetails({ product, variantStock }: Props) {
    const [variantImage, setVariantImage] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const touchStartX = useRef<number | null>(null);

    const images = product.images || [];
    const displayImages = variantImage
        ? [variantImage, ...images.filter(img => img !== variantImage)]
        : images;

    const prev = useCallback(() => {
        setActiveIndex(i => (i - 1 + displayImages.length) % displayImages.length);
    }, [displayImages.length]);

    const next = useCallback(() => {
        setActiveIndex(i => (i + 1) % displayImages.length);
    }, [displayImages.length]);

    // Reset to first image when variant changes
    useEffect(() => { setActiveIndex(0); }, [variantImage]);

    // Clamp index if image list shrinks
    useEffect(() => {
        if (activeIndex >= displayImages.length && displayImages.length > 0) setActiveIndex(0);
    }, [displayImages.length, activeIndex]);

    // Keyboard navigation when lightbox is open
    useEffect(() => {
        if (!lightboxOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxOpen(false);
            else if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxOpen, prev, next]);

    // Lock body scroll while lightbox is open
    useEffect(() => {
        document.body.style.overflow = lightboxOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [lightboxOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
        touchStartX.current = null;
    };

    const activeImage = displayImages[activeIndex];

    return (
        // md:items-start prevents the image column from stretching to match description height
        <div className="grid grid-cols-1 md:grid-cols-2 md:items-start">

            {/* ── Image Gallery ── */}
            <div className="relative bg-black/40 group">
                {displayImages.length > 0 ? (
                    <>
                        {/* Main image — aspect-[3/4] gives consistent height regardless of description length */}
                        <div
                            className="relative aspect-[3/4] overflow-hidden cursor-zoom-in select-none"
                            onClick={() => setLightboxOpen(true)}
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            {displayImages.map((img, i) => (
                                <img
                                    key={img + i}
                                    src={img}
                                    alt={`${product.name} — view ${i + 1}`}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                                        i === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}
                                    draggable={false}
                                />
                            ))}

                            {/* Zoom hint — desktop hover only */}
                            <div className="absolute bottom-3 right-3 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <ZoomIn size={15} className="text-white" />
                            </div>

                            {/* Image counter */}
                            {displayImages.length > 1 && (
                                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-mono px-2 py-1 rounded pointer-events-none">
                                    {activeIndex + 1} / {displayImages.length}
                                </div>
                            )}

                            {/* Prev arrow */}
                            {displayImages.length > 1 && (
                                <button
                                    onClick={e => { e.stopPropagation(); prev(); }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-all md:opacity-0 md:group-hover:opacity-100"
                                    aria-label="Previous image"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}

                            {/* Next arrow */}
                            {displayImages.length > 1 && (
                                <button
                                    onClick={e => { e.stopPropagation(); next(); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/90 text-white rounded-full p-1.5 transition-all md:opacity-0 md:group-hover:opacity-100"
                                    aria-label="Next image"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            )}

                            {/* Stock badge */}
                            {product.stock_status !== 'IN_STOCK' && (
                                <div className={`absolute top-4 left-4 px-3 py-1 text-sm font-bold uppercase tracking-wider z-10 ${
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

                        {/* Thumbnail strip */}
                        {displayImages.length > 1 && (
                            <div className="flex gap-2 p-3 bg-black/60 overflow-x-auto">
                                {displayImages.map((img, i) => (
                                    <button
                                        key={img + i}
                                        onClick={() => setActiveIndex(i)}
                                        className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all ${
                                            i === activeIndex
                                                ? 'border-rudark-volt opacity-100'
                                                : 'border-transparent opacity-40 hover:opacity-80'
                                        }`}
                                        aria-label={`View image ${i + 1}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" draggable={false} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="aspect-[3/4] flex items-center justify-center text-gray-500 font-condensed tracking-wider">
                        NO IMAGE AVAILABLE
                    </div>
                )}
            </div>

            {/* ── Product Details + Variant Selector ── */}
            <div className="p-8 md:p-12">
                <ProductDetails
                    product={product}
                    variantStock={variantStock}
                    onVariantImageChange={setVariantImage}
                />
            </div>

            {/* ── Lightbox ── */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={() => setLightboxOpen(false)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Image — stop propagation so clicks on the image itself don't close */}
                    <div
                        className="relative flex items-center justify-center w-full h-full p-16"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={activeImage}
                            alt={`${product.name} — view ${activeIndex + 1}`}
                            className="max-w-full max-h-full object-contain select-none"
                            draggable={false}
                        />
                    </div>

                    {/* Close */}
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-10 transition-colors"
                        aria-label="Close lightbox"
                    >
                        <X size={24} />
                    </button>

                    {/* Counter */}
                    {displayImages.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm font-mono pointer-events-none">
                            {activeIndex + 1} / {displayImages.length}
                        </div>
                    )}

                    {/* Prev arrow */}
                    {displayImages.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); prev(); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 z-10 transition-colors"
                            aria-label="Previous image"
                        >
                            <ChevronLeft size={28} />
                        </button>
                    )}

                    {/* Next arrow */}
                    {displayImages.length > 1 && (
                        <button
                            onClick={e => { e.stopPropagation(); next(); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 z-10 transition-colors"
                            aria-label="Next image"
                        >
                            <ChevronRight size={28} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
