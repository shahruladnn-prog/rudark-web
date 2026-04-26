'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Minus, Package, RefreshCw } from 'lucide-react';
import { recordStockMovement, getStockMovements, getProductsForAdjustment, StockMovement } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

interface ProductOption {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    variants: { sku: string; options: Record<string, string>; stock_quantity: number; label: string; }[];
}

const TYPE_STYLES = {
    RECEIVE: { active: 'bg-emerald-50 border-emerald-400 text-emerald-700', icon: <Plus size={16} />, label: 'Receive' },
    ADJUST:  { active: 'bg-blue-50 border-blue-400 text-blue-700',          icon: <Package size={16} />, label: 'Adjust' },
    DAMAGE:  { active: 'bg-red-50 border-red-400 text-red-600',             icon: <Minus size={16} />, label: 'Damage' },
};

export default function StockAdjustPage() {
    const { showToast } = useToast();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedVariant, setSelectedVariant] = useState('');
    const [adjustType, setAdjustType] = useState<'RECEIVE' | 'ADJUST' | 'DAMAGE'>('RECEIVE');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [reference, setReference] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [prods, movs] = await Promise.all([getProductsForAdjustment(), getStockMovements(20)]);
            setProducts(prods);
            setMovements(movs);
        } catch { showToast('error', 'Failed to load data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    const selectedProductData = products.find(p => p.id === selectedProduct);
    const hasVariants = !!selectedProductData?.variants.length;

    const getCurrentStock = () => {
        if (!selectedProductData) return 0;
        if (selectedVariant && hasVariants) {
            return selectedProductData.variants.find(v => v.sku === selectedVariant)?.stock_quantity || 0;
        }
        return selectedProductData.stock_quantity;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty === 0) { showToast('error', 'Enter a valid quantity'); return; }

        setSubmitting(true);
        const finalQty = adjustType === 'DAMAGE' ? -Math.abs(qty) : adjustType === 'ADJUST' ? qty : Math.abs(qty);
        const currentStock = getCurrentStock();

        const res = await recordStockMovement({
            product_id: selectedProduct,
            product_name: selectedProductData?.name || '',
            variant_sku: selectedVariant || undefined,
            variant_label: hasVariants && selectedVariant
                ? selectedProductData?.variants.find(v => v.sku === selectedVariant)?.label : undefined,
            type: adjustType,
            quantity: finalQty,
            previous_quantity: currentStock,
            new_quantity: currentStock + finalQty,
            reason: reason || undefined,
            reference: reference || undefined,
        });

        if (res.success) {
            showToast('success', `Stock ${adjustType === 'RECEIVE' ? 'received' : 'adjusted'} successfully`);
            setQuantity(''); setReason(''); setReference('');
            loadData();
        } else {
            showToast('error', res.error || 'Failed to adjust stock');
        }
        setSubmitting(false);
    };

    const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

    return (
        <div className="max-w-5xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Stock Adjustment</h1>
                    <p className="text-sm text-gray-400">Receive goods, correct counts, or write off damage</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Form */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">New Adjustment</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Product */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Product *</label>
                            <select value={selectedProduct}
                                onChange={e => { setSelectedProduct(e.target.value); setSelectedVariant(''); }}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                required>
                                <option value="">Select product…</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock_quantity}</option>
                                ))}
                            </select>
                        </div>

                        {/* Variant */}
                        {hasVariants && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Variant *</label>
                                <select value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}
                                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" required>
                                    <option value="">Select variant…</option>
                                    {selectedProductData?.variants.map(v => (
                                        <option key={v.sku} value={v.sku}>{v.label} ({v.sku}) — Stock: {v.stock_quantity}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Type *</label>
                            <div className="flex gap-2">
                                {(['RECEIVE', 'ADJUST', 'DAMAGE'] as const).map(t => (
                                    <button key={t} type="button" onClick={() => setAdjustType(t)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded border text-xs font-semibold transition-colors ${adjustType === t ? TYPE_STYLES[t].active : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                        {TYPE_STYLES[t].icon} {TYPE_STYLES[t].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                                Quantity * {adjustType === 'ADJUST' && '(negative to subtract)'}
                            </label>
                            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                                placeholder={adjustType === 'ADJUST' ? 'e.g. 10 or -5' : 'e.g. 10'}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" required />
                            {selectedProduct && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Current: <span className="text-gray-700 font-medium">{getCurrentStock()}</span>
                                    {quantity && !isNaN(parseInt(quantity)) && (
                                        <span className="ml-2">→ New: <span className={
                                            (adjustType === 'DAMAGE' ? -Math.abs(parseInt(quantity)) : parseInt(quantity)) < 0
                                                ? 'text-red-500 font-medium' : 'text-emerald-600 font-medium'
                                        }>{getCurrentStock() + (adjustType === 'DAMAGE' ? -Math.abs(parseInt(quantity)) : parseInt(quantity))}</span></span>
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Reason</label>
                            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                                placeholder="e.g. Stock count correction, Damaged in transit"
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                        </div>

                        {/* Reference */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Reference / PO Number</label>
                            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                                placeholder="e.g. PO-2024-001"
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                        </div>

                        <button type="submit"
                            disabled={submitting || !selectedProduct || (hasVariants && !selectedVariant)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-2.5 rounded hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                            {submitting ? <><RefreshCw size={15} className="animate-spin" /> Processing…</> : <><Package size={15} /> Apply Adjustment</>}
                        </button>
                    </form>
                </div>

                {/* Recent movements */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Movements</h2>
                    {loading ? (
                        <div className="text-gray-400 text-sm text-center py-8">Loading…</div>
                    ) : movements.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center py-8">No movements recorded yet</div>
                    ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {movements.map(m => (
                                <div key={m.id} className="border-b border-gray-50 pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-sm text-gray-900">{m.product_name}</div>
                                            {m.variant_label && <div className="text-xs text-gray-400">{m.variant_label}</div>}
                                        </div>
                                        <span className={`font-mono font-bold text-sm ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 mt-1 items-center text-xs">
                                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                                            m.type === 'RECEIVE' ? 'bg-emerald-50 text-emerald-700' :
                                            m.type === 'DAMAGE' ? 'bg-red-50 text-red-600' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>{m.type}</span>
                                        <span className="text-gray-400">{m.previous_quantity} → {m.new_quantity}</span>
                                        <span className="text-gray-400">{fmtDate(m.created_at as string)}</span>
                                    </div>
                                    {m.reason && <div className="text-xs text-gray-400 mt-1 italic">{m.reason}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
