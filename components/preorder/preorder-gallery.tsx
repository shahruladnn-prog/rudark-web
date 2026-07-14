'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Product, ProductVariant } from '@/types';
import { matchVariant } from '@/lib/variant-utils';
import { X, ZoomIn } from 'lucide-react';

interface Props {
    product: Product;
    // partialOptions always reflects current picks (even if incomplete, e.g. Color
    // chosen but not Size yet). variant is only non-null once every option matches
    // a real variant — that's the signal the form uses to allow submission.
    onSelectionChange: (partialOptions: Record<string, string>, variant: ProductVariant | null) => void;
}

// Best-effort color name -> hex mapping for rendering filled swatches.
// Falls back to a neutral dot + text label for anything not in the map.
const COLOR_NAME_TO_HEX: Record<string, string> = {
    red: '#DC2626', blue: '#2563EB', green: '#16A34A', black: '#111111',
    white: '#F5F5F5', grey: '#6B7280', gray: '#6B7280', orange: '#EA580C',
    yellow: '#EAB308', navy: '#1E3A5F', khaki: '#B4A369', olive: '#556B2F',
    camo: '#4B5320', tan: '#D2B48C', silver: '#C0C0C0', purple: '#7C3AED',
    pink: '#EC4899', brown: '#78350F', beige: '#D9C9A3', teal: '#0D9488',
    'sky blue': '#0EA5E9', 'royal blue': '#1D4ED8', 'orange red': '#EA580C',
};

function colorHex(name: string): string | null {
    return COLOR_NAME_TO_HEX[name.trim().toLowerCase()] || null;
}

// Only render an option group as color-swatch dots when it's actually a color
// option — anything else (Size, Material, etc.) renders as text pills, matching
// the site's existing product-details.tsx style.
function isColorOption(optionName: string): boolean {
    return optionName.trim().toLowerCase() === 'color';
}

export default function PreorderGallery({ product, onSelectionChange }: Props) {
    const images = product.images || [];
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const visibleVariants = useMemo(
        () => (product.variants || []).filter(v => v.stock_status !== 'ARCHIVED'),
        [product.variants]
    );

    // Resolve an image as soon as we know the color, even if other options (e.g.
    // Size) aren't picked yet — prefer the fully-specified variant's image once
    // everything is selected, falling back to any variant sharing the chosen color.
    const targetImage = useMemo(() => {
        const fullVariant = matchVariant(product, selectedOptions);
        if (fullVariant?.image) return fullVariant.image;

        const selectedColor = selectedOptions['Color'];
        if (selectedColor) {
            const colorMatch = visibleVariants.find(v => v.options?.Color === selectedColor && v.image);
            if (colorMatch?.image) return colorMatch.image;
        }

        return images[0] || null;
    }, [product, selectedOptions, visibleVariants, images]);

    // Two-image crossfade buffer: both nodes stay mounted briefly so the CSS
    // opacity transition actually animates instead of hard-cutting.
    const [activeSrc, setActiveSrc] = useState<string | null>(images[0] || null);
    const [imageHistory, setImageHistory] = useState<string[]>(() => (images[0] ? [images[0]] : []));

    useEffect(() => {
        if (!targetImage || targetImage === activeSrc) return;
        setImageHistory(prev => [targetImage, ...prev.filter(src => src !== targetImage)].slice(0, 2));
        setActiveSrc(targetImage);
        const cleanup = setTimeout(() => {
            setImageHistory(prev => prev.filter(src => src === targetImage));
        }, 250);
        return () => clearTimeout(cleanup);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetImage]);

    // Preload every variant image once the main image has settled, so the
    // crossfade on swatch click is instant instead of showing a network flash.
    useEffect(() => {
        const urls = visibleVariants.map(v => v.image).filter(Boolean) as string[];
        if (urls.length === 0) return;

        const preload = () => {
            urls.forEach(url => {
                const img = new window.Image();
                img.src = url;
            });
        };

        const idle = (window as any).requestIdleCallback;
        const handle = idle ? idle(preload) : window.setTimeout(preload, 300);

        return () => {
            if (idle && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
            else window.clearTimeout(handle);
        };
    }, [visibleVariants]);

    // Lightbox: Escape to close, lock body scroll while open.
    useEffect(() => {
        if (!lightboxOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
        window.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [lightboxOpen]);

    const handleOptionSelect = useCallback((optionName: string, value: string) => {
        const newOptions = { ...selectedOptions, [optionName]: value };
        setSelectedOptions(newOptions);

        const fullVariant = matchVariant(product, newOptions);
        onSelectionChange(newOptions, fullVariant || null);
    }, [selectedOptions, product, onSelectionChange]);

    return (
        <div>
            {/* Main image */}
            <div className="relative aspect-[3/4] bg-black/40 overflow-hidden mb-6 group">
                {imageHistory.length > 0 ? (
                    <>
                        <div
                            className="absolute inset-0 cursor-zoom-in"
                            onClick={() => setLightboxOpen(true)}
                        >
                            {imageHistory.map(img => (
                                <img
                                    key={img}
                                    src={img}
                                    alt={product.name}
                                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[200ms] ${
                                        img === activeSrc ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}
                                    draggable={false}
                                />
                            ))}
                            <div className="absolute bottom-3 right-3 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <ZoomIn size={15} className="text-white" />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-condensed tracking-wider">
                        NO IMAGE AVAILABLE
                    </div>
                )}
            </div>

            {/* Option selectors */}
            {(product.options || []).map(opt => {
                const useSwatches = isColorOption(opt.name);
                return (
                    <div key={opt.name} className="mb-6">
                        <label className="block text-sm font-medium mb-3 uppercase tracking-wider text-gray-300">
                            {opt.name}: {selectedOptions[opt.name] || ''}
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {opt.values.map(val => {
                                const isSelected = selectedOptions[opt.name] === val;

                                if (useSwatches) {
                                    const hex = colorHex(val);
                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => handleOptionSelect(opt.name, val)}
                                            aria-label={`${opt.name}: ${val}`}
                                            aria-pressed={isSelected}
                                            title={val}
                                            className={`relative w-9 h-9 rounded-full border-2 transition-transform hover:scale-105 ${
                                                isSelected ? 'border-rudark-volt ring-2 ring-rudark-volt ring-offset-2 ring-offset-rudark-matte' : 'border-gray-600'
                                            }`}
                                            style={hex ? { backgroundColor: hex } : undefined}
                                        >
                                            {!hex && (
                                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold uppercase text-white bg-gray-700 rounded-full">
                                                    {val.slice(0, 2)}
                                                </span>
                                            )}
                                        </button>
                                    );
                                }

                                return (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => handleOptionSelect(opt.name, val)}
                                        aria-pressed={isSelected}
                                        className={`px-4 py-2 border rounded transition-all font-medium ${
                                            isSelected
                                                ? 'bg-rudark-volt text-black border-rudark-volt'
                                                : 'border-gray-600 hover:border-rudark-volt text-white'
                                        }`}
                                    >
                                        {val}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Lightbox */}
            {lightboxOpen && activeSrc && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={() => setLightboxOpen(false)}
                >
                    <div className="relative flex items-center justify-center w-full h-full p-16" onClick={e => e.stopPropagation()}>
                        <img src={activeSrc} alt={product.name} className="max-w-full max-h-full object-contain select-none" draggable={false} />
                    </div>
                    <button
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 z-10 transition-colors"
                        aria-label="Close lightbox"
                    >
                        <X size={24} />
                    </button>
                </div>
            )}
        </div>
    );
}
