'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Package, Building2, AlertCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { getStores } from '@/actions/store-actions';
import { getProducts } from '@/actions/product-actions';
import { createTransfer, getTransfers, approveTransfer, completeTransfer, cancelTransfer } from '@/actions/stock-transfer-actions';
import { useToast } from '@/components/ui/toast';
import { CheckCircle2, XCircle, Inbox } from 'lucide-react';

interface Store { id: string; name: string; is_default?: boolean; }
interface ProductVariant { sku: string; options: Record<string, string>; stock_quantity: number; }
interface Product { id: string; name: string; sku: string; stock_quantity: number; variants?: ProductVariant[]; }
interface TransferItem { product_id: string; product_name: string; variant_sku?: string; variant_label?: string; quantity: number; current_stock: number; }

export default function StockTransferPage() {
    const { showToast } = useToast();
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [fromStore, setFromStore] = useState('');
    const [toStore, setToStore] = useState('');
    const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [notes, setNotes] = useState('');

    const loadPending = async () => {
        try {
            const t = await getTransfers({ status: 'PENDING', limit: 20 });
            setPendingTransfers(t);
        } catch { /* non-critical */ }
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [storesData, productsData] = await Promise.all([getStores(), getProducts()]);
                setStores(storesData);
                setProducts(productsData);
                const def = storesData.find((s: Store) => s.is_default);
                if (def) setFromStore(def.id);
            } catch { showToast('error', 'Failed to load data'); }
            setLoading(false);
        })();
        loadPending();
    }, []);

    const handleApprove = async (id: string) => {
        setActionLoading(id + '_approve');
        const res = await approveTransfer(id);
        if (res.success) { showToast('success', 'Transfer approved — stock reserved'); loadPending(); }
        else showToast('error', res.error || 'Approval failed');
        setActionLoading(null);
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Mark as completed? This will move stock to the destination store.')) return;
        setActionLoading(id + '_complete');
        const res = await completeTransfer(id);
        if (res.success) { showToast('success', 'Transfer completed'); loadPending(); }
        else showToast('error', res.error || 'Failed to complete');
        setActionLoading(null);
    };

    const handleCancel = async (id: string) => {
        const reason = prompt('Cancellation reason:');
        if (!reason?.trim()) return;
        setActionLoading(id + '_cancel');
        const res = await cancelTransfer(id, reason);
        if (res.success) { showToast('success', 'Transfer cancelled'); loadPending(); }
        else showToast('error', res.error || 'Failed to cancel');
        setActionLoading(null);
    };

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const addToTransfer = (product: Product, variant?: ProductVariant) => {
        if (transferItems.find(i => i.product_id === product.id && i.variant_sku === (variant?.sku || undefined))) return;
        const label = variant ? Object.values(variant.options).join(' / ') : undefined;
        setTransferItems([...transferItems, {
            product_id: product.id, product_name: product.name,
            variant_sku: variant?.sku, variant_label: label,
            quantity: 1, current_stock: variant?.stock_quantity ?? product.stock_quantity
        }]);
        setSearchQuery('');
    };

    const updateQty = (i: number, qty: number) => {
        const item = transferItems[i];
        if (qty < 1 || qty > item.current_stock) return;
        const u = [...transferItems]; u[i].quantity = qty; setTransferItems(u);
    };

    const handleSubmit = async () => {
        if (!fromStore || !toStore || fromStore === toStore) { showToast('error', 'Select different source and destination stores'); return; }
        if (transferItems.length === 0) { showToast('error', 'Add at least one product to transfer'); return; }
        setSubmitting(true);
        try {
            const res = await createTransfer({
                from_store_id: fromStore,
                from_store_name: stores.find(s => s.id === fromStore)?.name || '',
                to_store_id: toStore,
                to_store_name: stores.find(s => s.id === toStore)?.name || '',
                items: transferItems.map(i => ({ product_id: i.product_id, product_name: i.product_name, variant_sku: i.variant_sku, variant_label: i.variant_label, quantity: i.quantity })),
                notes,
            });
            if (res.success) {
                showToast('success', `Transfer created (ref: ${res.transferId?.slice(0, 8)}…) — PENDING approval`);
                setTransferItems([]); setNotes('');
            } else { showToast('error', res.error || 'Transfer failed'); }
        } catch (e: any) { showToast('error', e.message || 'Transfer failed'); }
        setSubmitting(false);
    };

    return (
        <div className="max-w-4xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Stock Transfer</h1>
                    <p className="text-sm text-gray-400">Move inventory between store locations</p>
                </div>
            </div>

            {/* Pending Approvals */}
            {pendingTransfers.length > 0 && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200 bg-amber-100/50">
                        <Inbox size={15} className="text-amber-600" />
                        <h2 className="text-sm font-semibold text-amber-800">Pending Approvals ({pendingTransfers.length})</h2>
                    </div>
                    <div className="divide-y divide-amber-100">
                        {pendingTransfers.map((t: any) => (
                            <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900">
                                        {t.from_store_name} → {t.to_store_name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {t.items?.length || 0} item(s) · Ref: {t.transfer_ref || t.id?.slice(0, 8)}
                                        {t.notes && ` · ${t.notes}`}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleApprove(t.id)}
                                        disabled={!!actionLoading}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        <CheckCircle2 size={12} />
                                        {actionLoading === t.id + '_approve' ? 'Approving…' : 'Approve'}
                                    </button>
                                    <button
                                        onClick={() => handleComplete(t.id)}
                                        disabled={!!actionLoading}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                    >
                                        <CheckCircle2 size={12} />
                                        {actionLoading === t.id + '_complete' ? 'Completing…' : 'Complete'}
                                    </button>
                                    <button
                                        onClick={() => handleCancel(t.id)}
                                        disabled={!!actionLoading}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white text-red-600 text-xs font-medium border border-red-200 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                                    >
                                        <XCircle size={12} />
                                        {actionLoading === t.id + '_cancel' ? 'Cancelling…' : 'Cancel'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
            ) : stores.length < 2 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
                    <AlertCircle size={28} className="mx-auto text-amber-500 mb-3" />
                    <h3 className="text-amber-700 font-semibold mb-2">Multiple Stores Required</h3>
                    <p className="text-gray-500 text-sm mb-4">Stock transfers require at least 2 store locations.</p>
                    <Link href="/admin/stores/new" className="text-blue-600 text-sm hover:underline">+ Add Another Store</Link>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-5">
                    {/* Left */}
                    <div className="space-y-4">
                        {/* Store direction */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">Transfer Direction</h2>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-1 block">From</label>
                                    <select value={fromStore} onChange={e => setFromStore(e.target.value)}
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                                        <option value="">Select source…</option>
                                        {stores.map(s => <option key={s.id} value={s.id} disabled={s.id === toStore}>{s.name}{s.is_default ? ' (Default)' : ''}</option>)}
                                    </select>
                                </div>
                                <ArrowRight size={18} className="text-blue-500 mt-4 shrink-0" />
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-1 block">To</label>
                                    <select value={toStore} onChange={e => setToStore(e.target.value)}
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                                        <option value="">Select destination…</option>
                                        {stores.map(s => <option key={s.id} value={s.id} disabled={s.id === fromStore}>{s.name}{s.is_default ? ' (Default)' : ''}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Product search */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">Add Products</h2>
                            <div className="flex items-center gap-2 border border-gray-200 rounded px-3 mb-3">
                                <Search size={14} className="text-gray-400 shrink-0" />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search products…" className="flex-1 text-sm py-2 focus:outline-none" />
                            </div>
                            {searchQuery && (
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {filtered.length === 0 ? (
                                        <div className="text-gray-400 text-sm text-center py-4">No products found</div>
                                    ) : filtered.slice(0, 10).map(p => (
                                        <div key={p.id} className="border border-gray-100 rounded p-3 bg-gray-50">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                                    <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                                                </div>
                                                {(!p.variants?.length) && (
                                                    <button onClick={() => addToTransfer(p)}
                                                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">+ Add</button>
                                                )}
                                            </div>
                                            {p.variants && p.variants.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {p.variants.map(v => (
                                                        <button key={v.sku} onClick={() => addToTransfer(p, v)}
                                                            className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:border-blue-400 hover:text-blue-600 transition-colors">
                                                            {Object.values(v.options).join('/')} ({v.stock_quantity})
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">Transfer Summary</h2>
                        <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-100 rounded p-3 mb-4 text-sm">
                            <Building2 size={14} className="text-gray-400" />
                            <span className="text-gray-700">{stores.find(s => s.id === fromStore)?.name || 'Source'}</span>
                            <ArrowRight size={14} className="text-blue-500" />
                            <span className="text-gray-700">{stores.find(s => s.id === toStore)?.name || 'Destination'}</span>
                        </div>

                        {transferItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">No items added yet.<br />Search and add products above.</div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                                {transferItems.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-100">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="text-sm text-gray-900 truncate">{item.product_name}</div>
                                            {item.variant_label && <div className="text-xs text-gray-400">{item.variant_label}</div>}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => updateQty(i, item.quantity - 1)} className="w-6 h-6 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300">−</button>
                                            <span className="w-7 text-center text-sm font-mono font-medium">{item.quantity}</span>
                                            <button onClick={() => updateQty(i, item.quantity + 1)} className="w-6 h-6 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300">+</button>
                                            <button onClick={() => setTransferItems(transferItems.filter((_, j) => j !== i))} className="ml-1 text-red-400 hover:text-red-500 text-xs">✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                placeholder="Transfer reason, reference…"
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                        </div>

                        <button onClick={handleSubmit}
                            disabled={submitting || !fromStore || !toStore || transferItems.length === 0}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                            {submitting ? <><RefreshCw size={14} className="animate-spin" /> Processing…</> : <><Package size={14} /> Create Transfer ({transferItems.reduce((s, i) => s + i.quantity, 0)} units)</>}
                        </button>

                        <p className="mt-2 text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                            <Clock size={11} /> Transfers require approval before processing
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
