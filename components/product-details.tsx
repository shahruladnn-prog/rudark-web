'use client';

import { Product } from '@/types';
import { useState, useEffect } from 'react';
import AddToCartButton from './add-to-cart-button';
import { trackViewItem } from '@/lib/analytics';
import { resolvePurchaseMode } from '@/lib/catalog-utils';

export default function ProductDetails({
    product,
    variantStock = {},
    onVariantImageChange,
}: {
    product: Product;
    variantStock?: Record<string, number>;
    onVariantImageChange?: (imageUrl: string | null) => void;
}) {
    // Initialize default options
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

    // Client-side stock fetching for live data
    const [liveStock, setLiveStock] = useState<Record<string, number>>(variantStock);
    const [stockLoading, setStockLoading] = useState(true);

    // Fire view_item analytics once on mount
    useEffect(() => {
        trackViewItem({
            name: product.name,
            sku: product.sku,
            price: product.promo_price || product.web_price,
            category: product.category_slug,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.sku]);

    // Fetch stock client-side for fresh data
    useEffect(() => {
        const fetchStock = async () => {
            try {
                // Get all variant SKUs
                const skus = (product.variants || [])
                    .filter(v => v.stock_status !== 'ARCHIVED')
                    .map(v => v.sku);

                if (skus.length === 0) {
                    setStockLoading(false);
                    return;
                }

                const response = await fetch(`/api/stock?skus=${skus.join(',')}`);
                if (response.ok) {
                    const data = await response.json();
                    // Merge — don't replace. Replacing would wipe server-side stock values
                    // for any variant the API didn't return (e.g. if variant_skus index is stale).
                    setLiveStock(prev => ({ ...prev, ...(data.stocks || {}) }));
                }
            } catch (error) {
                console.error('Failed to fetch stock:', error);
                // Keep initial variantStock on error
            } finally {
                setStockLoading(false);
            }
        };

        fetchStock();
    }, [product.variants]);

    // Auto-select first value for each option on load?
    // Or force user to select? "Force select" is safer to avoid returns.
    // Let's force select for now, or just leave empty.

    const isAllSelected = (product.options || []).every(opt => selectedOptions[opt.name]);

    const handleOptionSelect = (optionName: string, value: string) => {
        const newOptions = { ...selectedOptions, [optionName]: value };
        setSelectedOptions(newOptions);

        // Notify parent of variant image if all options selected
        if (onVariantImageChange) {
            const allSelected = (product.options || []).every(opt =>
                opt.name === optionName ? true : !!newOptions[opt.name]
            );
            if (allSelected) {
                const matchedVariant = (product.variants || []).find(v =>
                    Object.entries(v.options).every(([k, val]) =>
                        (k === optionName ? value : newOptions[k]) === val
                    )
                );
                onVariantImageChange(matchedVariant?.image || null);
            }
        }
    };

    // Filter out ARCHIVED variants
    const visibleVariants = (product.variants || []).filter(v => v.stock_status !== 'ARCHIVED');

    // Find active variant based on all selected option values matching
    const activeVariant = visibleVariants.find(v => {
        if (!v.options || Object.keys(v.options).length === 0) return false;
        return Object.entries(v.options).every(([key, val]) => val && selectedOptions[key] === val);
    });

    // Determine current price and display
    const basePrice = activeVariant ? activeVariant.price : product.web_price;
    const promoPrice = activeVariant ? activeVariant.promo_price : product.promo_price;
    // Current valid price is promo if exists, else base
    const currentPrice = promoPrice || basePrice;

    const currentSku = activeVariant ? activeVariant.sku : product.sku;

    // Get stock for current variant - use liveStock for fresh data
    // For simple products (no variants), fall back to the Firebase-synced quantity
    const currentStock = activeVariant
        ? (liveStock[activeVariant.sku] || 0)
        : (product.stock_quantity || 0);

    // Stock Status Logic
    // If activeVariant exists, use its status
    // Else fall back to product status
    let currentStatus = (activeVariant ? activeVariant.stock_status : product.stock_status) as 'IN_STOCK' | 'OUT' | 'LOW' | 'ARCHIVED' | 'CONTACT_US';
    const purchaseMode = resolvePurchaseMode(product);
    const showContactOnly =
        !product.is_public ||
        purchaseMode === 'inquire' ||
        purchaseMode === 'display' ||
        currentStatus === 'CONTACT_US';

    // If explicit "OUT", force out. If "IN_STOCK", it means "Selling" -> checked via API later, 
    // but for UI display we trust the DB status 'IN_STOCK' unless checkStock says otherwise.
    // NOTE: The real-time check happens in the server action/add-to-cart. 

    return (
        <div className="flex flex-col h-full justify-center">
            <div className="mb-2 text-sm text-rudark-volt font-mono tracking-[0.2em] uppercase">
                {/* {product.category || 'Gear'} */}
            </div>

            <h1 className="text-4xl md:text-5xl font-condensed font-bold text-white mb-4 uppercase leading-none">
                {product.name}
            </h1>

            <div className="flex items-center gap-4 mb-8 border-b border-rudark-grey/30 pb-4 inline-flex">
                <div className="text-3xl font-condensed font-bold text-white">
                    RM {currentPrice.toFixed(2)}
                </div>
                {promoPrice && (
                    <div className="text-xl font-condensed font-bold text-gray-500 line-through decoration-rudark-volt/50">
                        RM {basePrice.toFixed(2)}
                    </div>
                )}
            </div>

            <div className="prose prose-invert prose-p:text-gray-400 prose-p:font-light prose-headings:font-condensed prose-headings:uppercase mb-8 max-w-none">
                <div className="whitespace-pre-line leading-relaxed">
                    {product.description || "No description available."}
                </div>
            </div>

            {/* Variants Selector */}
            {product.options && product.options.length > 0 && (
                <div className="mb-8 space-y-6">
                    {product.options.map((opt) => (
                        <div key={opt.name}>
                            <label className="block text-sm font-medium mb-3 uppercase tracking-wider text-gray-300">
                                {opt.name}: {selectedOptions[opt.name] || ''}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {opt.values.map((val) => {
                                    // Find variant with this option value to check stock
                                    const variantWithOption = visibleVariants.find(v =>
                                        v.options[opt.name] === val
                                    );
                                    const stock = variantWithOption ? (liveStock[variantWithOption.sku] || 0) : 0;
                                    // While loading, show all options as available (clickable)
                                    const isAvailable = stockLoading || stock > 0;
                                    const isSelected = selectedOptions[opt.name] === val;

                                    return (
                                        <button
                                            key={val}
                                            onClick={() => isAvailable && handleOptionSelect(opt.name, val)}
                                            disabled={!isAvailable}
                                            className={`
                                                px-4 py-2 border rounded transition-all font-medium
                                                ${isSelected
                                                    ? 'bg-rudark-volt text-black border-rudark-volt'
                                                    : isAvailable
                                                        ? 'border-gray-600 hover:border-rudark-volt text-white'
                                                        : 'border-gray-800 bg-gray-900/50 opacity-30 cursor-not-allowed text-gray-600'
                                                }
                                            `}
                                        >
                                            {val}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stock Status Display (without exact numbers) */}
            {activeVariant && (
                <div className="mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">SKU:</span>
                        <span className="text-sm font-mono text-rudark-volt">{currentSku}</span>
                    </div>
                </div>
            )}

            <div className="mt-auto pt-8 border-t border-rudark-grey/30">
                <div className="flex flex-col gap-4">
                    {/* Action Area: Contact Us or Add to Cart */}
                    {showContactOnly ? (
                        <div className="bg-rudark-carbon border border-blue-900/50 p-6 rounded-sm space-y-4">
                            <div className="flex items-center gap-3 text-blue-400 mb-2">
                                <span className="font-bold uppercase tracking-wide text-sm">Unavailable Online</span>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                This item requires special shipping or handling arrangements (e.g. oversize).
                                Please contact us directly to purchase.
                            </p>
                            <div className="flex flex-col gap-3 pt-2">
                                <a
                                    href={`https://wa.me/60135518857?text=Hi, I am interested in buying ${encodeURIComponent(product.name)} (SKU: ${currentSku})`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 bg-[#25D366] text-black font-bold uppercase py-3 px-4 rounded-sm hover:brightness-110 transition-all"
                                >
                                    WhatsApp (+6013 551 8857)
                                </a>
                                <a
                                    href={`mailto:rudark.my?subject=Inquiry: ${product.name}&body=Hi, I would like to inquire about ${product.name} (SKU: ${currentSku}).`}
                                    className="flex items-center justify-center gap-2 border border-gray-600 text-white font-bold uppercase py-3 px-4 rounded-sm hover:border-white transition-all"
                                >
                                    Email (rudark.my)
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 text-xs font-mono text-gray-500 mb-2 uppercase">
                                <span>SKU: {currentSku}</span>
                                {currentStatus === 'OUT' ? (
                                    <span className="text-red-500 font-bold">SOLD OUT</span>
                                ) : currentStatus === 'LOW' ? (
                                    <span className="text-orange-400 font-bold">
                                        {!stockLoading && currentStock > 0 && currentStock <= 10
                                            ? `ONLY ${currentStock} LEFT`
                                            : 'LOW STOCK'}
                                    </span>
                                ) : (currentStatus as string) === 'CONTACT_US' ? (
                                    <span className="text-blue-400 font-bold">SPECIAL ORDER</span>
                                ) : (
                                    <span className="text-rudark-volt font-bold">IN STOCK</span>
                                )}
                            </div>

                            {product.options && product.options.length > 0 && !isAllSelected ? (
                                <button disabled className="w-full md:w-auto px-8 py-4 font-condensed font-bold text-xl uppercase tracking-wider bg-rudark-grey text-gray-500 cursor-not-allowed">
                                    Select Options
                                </button>
                            ) : currentStatus === 'OUT' ? (
                                <button disabled className="w-full md:w-auto px-8 py-4 font-condensed font-bold text-xl uppercase tracking-wider bg-red-900/20 border border-red-900 text-red-500 cursor-not-allowed">
                                    Sold Out
                                </button>
                            ) : (
                                <AddToCartButton
                                    product={{
                                        ...product,
                                        sku: currentSku,
                                        web_price: currentPrice
                                    }}
                                    selectedOptions={selectedOptions}
                                />
                            )}

                            {/* Trust strip */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                                <span className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                                    <span className="text-rudark-volt">🔒</span> Secure Checkout
                                </span>
                                <span className="text-rudark-grey hidden sm:inline">|</span>
                                <span className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                                    <span className="text-rudark-volt">↩</span> 7-Day Returns
                                </span>
                                <span className="text-rudark-grey hidden sm:inline">|</span>
                                <span className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                                    <span className="text-rudark-volt">✓</span> Real-Time Stock
                                </span>
                                <span className="text-rudark-grey hidden sm:inline">|</span>
                                <span className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                                    <span className="text-rudark-volt">📦</span> Ships in 1–3 Days
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
