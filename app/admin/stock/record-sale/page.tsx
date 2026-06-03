'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { getProductsForAdjustment } from '@/actions/stock-movement-actions';
import { recordExternalSale } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

type Channel = 'physical_store' | 'tiktok' | 'shopee' | 'event' | 'other';

const CHANNELS: { id: Channel; label: string; color: string }[] = [
    { id: 'physical_store', label: 'Physical Store', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'tiktok', label: 'TikTok Shop', color: 'bg-pink-100 text-pink-800 border-pink-300' },
    { id: 'shopee', label: 'Shopee', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { id: 'event', label: 'Event', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

type ProductOption = {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    variants: { sku: string; options: Record<string, string>; stock_quantity: number; label: string }[];
};

type TodaySale = {
    time: string;
    productName: string;
    variantLabel?: string;
    quantity: number;
    channel: Channel;
    reference?: string;
};

export default function RecordExternalSalePage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [channel, setChannel] = useState<Channel>('physical_store');
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
    const [selectedVariantSku, setSelectedVariantSku] = useState<string>('');
    const [quantity, setQuantity] = useState(1);
    const [reference, setReference] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [todaySales, setTodaySales] = useState<TodaySale[]>([]);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getProductsForAdjustment().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    const filtered = products.filter(p => {
        if (!search.trim()) return false;
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) ||
            p.variants.some(v => v.sku.toLowerCase().includes(s));
    }).slice(0, 8);

    const selectProduct = (p: ProductOption) => {
        setSelectedProduct(p);
        setSearch(p.name);
        setShowDropdown(false);
        setSelectedVariantSku(p.variants.length > 0 ? '' : p.sku);
        setQuantity(1);
        searchRef.current?.blur();
    };

    const handleSubmit = async () => {
        if (!selectedProduct) { showToast('warning', 'Please select a product'); return; }
        if (selectedProduct.variants.length > 0 && !selectedVariantSku) { showToast('warning', 'Please select a variant'); return; }
        if (quantity <= 0) { showToast('warning', 'Quantity must be at least 1'); return; }

        const selectedVariant = selectedProduct.variants.find(v => v.sku === selectedVariantSku);

        setSubmitting(true);
        try {
            const result = await recordExternalSale({
                product_id: selectedProduct.id,
                product_name: selectedProduct.name,
                variant_sku: selectedVariant?.sku,
                variant_label: selectedVariant?.label,
                quantity,
                channel,
                reference: reference.trim() || undefined,
            });

            if (!result.success) {
                showToast('error', result.error || 'Failed to record sale');
                return;
            }

            if (result.warning) {
                showToast('warning', result.warning);
            } else {
                showToast('success', `Recorded: ${quantity}× ${selectedProduct.name}${selectedVariant ? ` (${selectedVariant.label})` : ''}`);
            }

            // Add to today's log
            setTodaySales(prev => [{
                time: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
                productName: selectedProduct.name,
                variantLabel: selectedVariant?.label,
                quantity,
                channel,
                reference: reference.trim() || undefined,
            }, ...prev]);

            // Reset form for next entry (keep channel and reference)
            setSelectedProduct(null);
            setSearch('');
            setSelectedVariantSku('');
            setQuantity(1);
            searchRef.current?.focus();

            // Refresh stock numbers
            const updated = await getProductsForAdjustment();
            setProducts(updated);

        } catch (e: any) {
            showToast('error', e.message || 'Failed to record sale');
        } finally {
            setSubmitting(false);
        }
    };

    const channelLabel = CHANNELS.find(c => c.id === channel)?.label || channel;

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Record External Sale</h1>
                    <p className="text-gray-500 text-sm">Deduct stock for sales from Loyverse, TikTok, Shopee, or events</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                {/* Channel picker */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Sales Channel</label>
                    <div className="flex flex-wrap gap-2">
                        {CHANNELS.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setChannel(c.id)}
                                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${channel === c.id ? c.color + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product search */}
                <div className="relative">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Product</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search product by name or SKU..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelectedProduct(null); }}
                            onFocus={() => setShowDropdown(true)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {showDropdown && filtered.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            {filtered.map(p => (
                                <button
                                    key={p.id}
                                    onMouseDown={() => selectProduct(p)}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                                >
                                    <div className="font-medium text-gray-900 text-sm">{p.name}</div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="font-mono text-xs text-gray-400">{p.sku}</span>
                                        <span className={`text-xs font-medium ${p.stock_quantity === 0 ? 'text-red-500' : p.stock_quantity <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                                            {p.stock_quantity} in stock
                                        </span>
                                        {p.variants.length > 0 && <span className="text-xs text-gray-400">{p.variants.length} variants</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Variant picker */}
                {selectedProduct && selectedProduct.variants.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Variant</label>
                        <div className="flex flex-wrap gap-2">
                            {selectedProduct.variants.map(v => (
                                <button
                                    key={v.sku}
                                    onClick={() => setSelectedVariantSku(v.sku)}
                                    className={`px-3 py-1.5 rounded border text-sm transition-all ${selectedVariantSku === v.sku
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {v.label}
                                    <span className={`ml-1.5 text-xs ${v.stock_quantity === 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                        ({v.stock_quantity})
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quantity */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity Sold</label>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-10 h-10 border border-gray-200 rounded-lg text-lg font-bold text-gray-600 hover:bg-gray-50"
                        >−</button>
                        <input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 text-center text-xl font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={() => setQuantity(q => q + 1)}
                            className="w-10 h-10 border border-gray-200 rounded-lg text-lg font-bold text-gray-600 hover:bg-gray-50"
                        >+</button>
                    </div>
                </div>

                {/* Reference */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Reference <span className="text-gray-400 font-normal normal-case">(optional — order no., receipt no.)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. TKT-123456, Receipt #001"
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !selectedProduct || loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                    {submitting ? 'Recording...' : `Record ${quantity > 1 ? quantity + '× ' : ''}${selectedProduct?.name || 'Sale'} — ${channelLabel}`}
                </button>
            </div>

            {/* Today's sales log */}
            {todaySales.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-gray-400" />
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Recorded This Session</h2>
                    </div>
                    <div className="space-y-2">
                        {todaySales.map((sale, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-4 py-3">
                                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900">
                                        {sale.quantity}× {sale.productName}
                                        {sale.variantLabel && <span className="text-gray-500"> — {sale.variantLabel}</span>}
                                    </div>
                                    {sale.reference && <div className="text-xs text-gray-400">{sale.reference}</div>}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className={`text-xs px-2 py-0.5 rounded-full border ${CHANNELS.find(c => c.id === sale.channel)?.color}`}>
                                        {CHANNELS.find(c => c.id === sale.channel)?.label}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">{sale.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
