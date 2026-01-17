'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Minus, Package, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { recordStockMovement, getStockMovements, getProductsForAdjustment, StockMovement } from '@/actions/stock-movement-actions';

interface ProductOption {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    variants: {
        sku: string;
        options: Record<string, string>;
        stock_quantity: number;
        label: string;
    }[];
}

export default function StockAdjustPage() {
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Form state
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedVariant, setSelectedVariant] = useState('');
    const [adjustType, setAdjustType] = useState<'RECEIVE' | 'ADJUST' | 'DAMAGE'>('RECEIVE');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [reference, setReference] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [productsData, movementsData] = await Promise.all([
                getProductsForAdjustment(),
                getStockMovements(20)
            ]);
            setProducts(productsData);
            setMovements(movementsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedProductData = products.find(p => p.id === selectedProduct);
    const hasVariants = selectedProductData && selectedProductData.variants.length > 0;

    const getCurrentStock = (): number => {
        if (!selectedProductData) return 0;
        if (selectedVariant && hasVariants) {
            const variant = selectedProductData.variants.find(v => v.sku === selectedVariant);
            return variant?.stock_quantity || 0;
        }
        return selectedProductData.stock_quantity;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty === 0) {
            setResult({ success: false, message: 'Enter a valid quantity' });
            setSubmitting(false);
            return;
        }

        // For damage/adjust negative, make it negative
        const finalQty = adjustType === 'DAMAGE' ? -Math.abs(qty) :
            adjustType === 'ADJUST' ? qty : Math.abs(qty);

        const currentStock = getCurrentStock();

        const res = await recordStockMovement({
            product_id: selectedProduct,
            product_name: selectedProductData?.name || '',
            variant_sku: selectedVariant || undefined,
            variant_label: hasVariants && selectedVariant ?
                selectedProductData?.variants.find(v => v.sku === selectedVariant)?.label : undefined,
            type: adjustType,
            quantity: finalQty,
            previous_quantity: currentStock,
            new_quantity: currentStock + finalQty,
            reason: reason || undefined,
            reference: reference || undefined
        });

        if (res.success) {
            setResult({ success: true, message: `Stock ${adjustType === 'RECEIVE' ? 'received' : 'adjusted'} successfully` });
            // Reset form
            setQuantity('');
            setReason('');
            setReference('');
            // Reload data
            loadData();
        } else {
            setResult({ success: false, message: res.error || 'Failed to adjust stock' });
        }

        setSubmitting(false);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-MY', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-rudark-grey pb-6 mb-8">
                <Link
                    href="/admin/stock"
                    className="p-2 text-gray-400 hover:text-rudark-volt transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Stock <span className="text-rudark-volt">Adjustment</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Receive goods, correct counts, or write off damage
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Adjustment Form */}
                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                    <h2 className="text-lg font-bold text-white uppercase mb-6">New Adjustment</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Product Selection */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase block mb-1">Product *</label>
                            <select
                                value={selectedProduct}
                                onChange={(e) => {
                                    setSelectedProduct(e.target.value);
                                    setSelectedVariant('');
                                }}
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                required
                            >
                                <option value="">Select product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.sku}) - Stock: {p.stock_quantity}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Variant Selection */}
                        {hasVariants && (
                            <div>
                                <label className="text-xs text-gray-500 uppercase block mb-1">Variant *</label>
                                <select
                                    value={selectedVariant}
                                    onChange={(e) => setSelectedVariant(e.target.value)}
                                    className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                    required
                                >
                                    <option value="">Select variant...</option>
                                    {selectedProductData?.variants.map(v => (
                                        <option key={v.sku} value={v.sku}>
                                            {v.label} ({v.sku}) - Stock: {v.stock_quantity}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Adjustment Type */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase block mb-2">Type *</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAdjustType('RECEIVE')}
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-sm border font-bold uppercase transition-colors ${adjustType === 'RECEIVE'
                                            ? 'bg-green-900/30 border-green-500 text-green-400'
                                            : 'border-rudark-grey text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    <Plus size={18} />
                                    Receive
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdjustType('ADJUST')}
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-sm border font-bold uppercase transition-colors ${adjustType === 'ADJUST'
                                            ? 'bg-blue-900/30 border-blue-500 text-blue-400'
                                            : 'border-rudark-grey text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    <Package size={18} />
                                    Adjust
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdjustType('DAMAGE')}
                                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-sm border font-bold uppercase transition-colors ${adjustType === 'DAMAGE'
                                            ? 'bg-red-900/30 border-red-500 text-red-400'
                                            : 'border-rudark-grey text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    <Minus size={18} />
                                    Damage
                                </button>
                            </div>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase block mb-1">
                                Quantity * {adjustType === 'ADJUST' && '(negative to subtract)'}
                            </label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                placeholder={adjustType === 'ADJUST' ? 'e.g. 10 or -5' : 'e.g. 10'}
                                required
                            />
                            {selectedProduct && (
                                <div className="text-xs text-gray-500 mt-1">
                                    Current stock: <span className="text-white">{getCurrentStock()}</span>
                                    {quantity && !isNaN(parseInt(quantity)) && (
                                        <span className="ml-2">
                                            → New: <span className={
                                                adjustType === 'DAMAGE'
                                                    ? 'text-red-400'
                                                    : parseInt(quantity) > 0 ? 'text-green-400' : 'text-red-400'
                                            }>
                                                {getCurrentStock() + (adjustType === 'DAMAGE' ? -Math.abs(parseInt(quantity)) : parseInt(quantity))}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase block mb-1">Reason</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                placeholder="e.g. Stock count correction, Damaged in transit"
                            />
                        </div>

                        {/* Reference */}
                        <div>
                            <label className="text-xs text-gray-500 uppercase block mb-1">Reference / PO Number</label>
                            <input
                                type="text"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                placeholder="e.g. PO-2024-001"
                            />
                        </div>

                        {/* Result */}
                        {result && (
                            <div className={`p-3 rounded-sm flex items-center gap-2 ${result.success ? 'bg-green-900/20 border border-green-900/50' : 'bg-red-900/20 border border-red-900/50'
                                }`}>
                                {result.success ? <CheckCircle size={18} className="text-green-400" /> : <AlertCircle size={18} className="text-red-400" />}
                                <span className={result.success ? 'text-green-400' : 'text-red-400'}>{result.message}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || !selectedProduct || (hasVariants && !selectedVariant)}
                            className="w-full flex items-center justify-center gap-2 bg-rudark-volt text-black font-bold uppercase py-3 rounded-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Package size={18} />
                                    Apply Adjustment
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Recent Movements */}
                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                    <h2 className="text-lg font-bold text-white uppercase mb-6">Recent Movements</h2>

                    {loading ? (
                        <div className="text-gray-500 text-center py-8">Loading...</div>
                    ) : movements.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">No movements recorded yet</div>
                    ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {movements.map(m => (
                                <div key={m.id} className="border-b border-rudark-grey/30 pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-white text-sm">{m.product_name}</div>
                                            {m.variant_label && (
                                                <div className="text-gray-500 text-xs">{m.variant_label}</div>
                                            )}
                                        </div>
                                        <div className={`font-mono font-bold ${m.quantity > 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                        <span className={`px-1.5 py-0.5 rounded ${m.type === 'RECEIVE' ? 'bg-green-900/30 text-green-400' :
                                                m.type === 'DAMAGE' ? 'bg-red-900/30 text-red-400' :
                                                    'bg-gray-800 text-gray-400'
                                            }`}>
                                            {m.type}
                                        </span>
                                        <span>{m.previous_quantity} → {m.new_quantity}</span>
                                        <span>{formatDate(m.created_at as string)}</span>
                                    </div>
                                    {m.reason && (
                                        <div className="text-xs text-gray-500 mt-1 italic">{m.reason}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
