'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Plus, Trash2, Check, FileText } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { recordStockMovement } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

interface ProductOption {
    id: string; name: string; sku: string; stock_quantity: number;
    variants?: Array<{ sku: string; options: Record<string, string>; stock_quantity?: number; }>;
}
interface ReceiveItem { product_id: string; product_name: string; variant_sku?: string; variant_label?: string; quantity: number; current_stock: number; }

export default function StockReceivingPage() {
    const { showToast } = useToast();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [addingProduct, setAddingProduct] = useState('');
    const [addingVariant, setAddingVariant] = useState('');
    const [addingQuantity, setAddingQuantity] = useState(1);

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data.map((p: any) => ({ id: p.id, name: p.name || 'Unnamed', sku: p.sku || '', stock_quantity: p.stock_quantity ?? 0, variants: p.variants || [] })));
        } catch { showToast('error', 'Failed to load products'); }
        setLoading(false);
    };

    const selectedProduct = products.find(p => p.id === addingProduct);
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddItem = () => {
        if (!addingProduct || addingQuantity < 1) return;
        const product = products.find(p => p.id === addingProduct);
        if (!product) return;
        const variant = addingVariant ? product.variants?.find(v => v.sku === addingVariant) : null;
        const currentStock = variant ? (variant.stock_quantity ?? 0) : product.stock_quantity;
        const variantLabel = variant ? Object.values(variant.options).join(' / ') : undefined;
        const existingIdx = receiveItems.findIndex(i => i.product_id === addingProduct && i.variant_sku === (addingVariant || undefined));
        if (existingIdx >= 0) {
            const u = [...receiveItems]; u[existingIdx].quantity += addingQuantity; setReceiveItems(u);
        } else {
            setReceiveItems([...receiveItems, { product_id: addingProduct, product_name: product.name, variant_sku: addingVariant || undefined, variant_label: variantLabel, quantity: addingQuantity, current_stock: currentStock }]);
        }
        setAddingProduct(''); setAddingVariant(''); setAddingQuantity(1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (receiveItems.length === 0) { showToast('warning', 'Add at least one item to receive'); return; }
        setSubmitting(true);
        try {
            for (const item of receiveItems) {
                await recordStockMovement({ product_id: item.product_id, product_name: item.product_name, variant_sku: item.variant_sku, variant_label: item.variant_label, type: 'RECEIVE', quantity: item.quantity, previous_quantity: item.current_stock, new_quantity: item.current_stock + item.quantity, reason: notes || 'Stock received', reference: referenceNumber || undefined, created_by: 'admin' });
            }
            showToast('success', `${receiveItems.length} item(s) received — stock updated`);
            setReceiveItems([]); setReferenceNumber(''); setNotes('');
        } catch (err) { showToast('error', 'Error receiving stock: ' + err); }
        setSubmitting(false);
    };

    const totalQty = receiveItems.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="max-w-4xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Stock Receiving</h1>
                    <p className="text-sm text-gray-400">Record incoming inventory from suppliers</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400 text-sm">Loading products…</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Add Items */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Plus size={16} className="text-emerald-600" /> Add Items</h2>
                            <input type="text" placeholder="Filter products…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue-400" />
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs text-gray-500 mb-1 block">Product</label>
                                    <select value={addingProduct} onChange={e => { setAddingProduct(e.target.value); setAddingVariant(''); }}
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                                        <option value="">— Select Product —</option>
                                        {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                    </select>
                                </div>
                                {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-xs text-gray-500 mb-1 block">Variant</label>
                                        <select value={addingVariant} onChange={e => setAddingVariant(e.target.value)}
                                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                                            <option value="">— No variant —</option>
                                            {selectedProduct.variants.map(v => (
                                                <option key={v.sku} value={v.sku}>{Object.values(v.options || {}).join(' / ') || v.sku}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                                    <input type="number" min={1} value={addingQuantity} onChange={e => setAddingQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                                </div>
                                <div className="flex items-end">
                                    <button type="button" onClick={handleAddItem} disabled={!addingProduct}
                                        className="w-full px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 disabled:opacity-50 text-sm transition-colors">
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Items list */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Package size={16} /> Items to Receive ({receiveItems.length})</h2>
                            {receiveItems.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-6">No items added yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {receiveItems.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                                {item.variant_label && <div className="text-xs text-gray-400">{item.variant_label}</div>}
                                                <div className="text-xs text-gray-400">{item.current_stock} → {item.current_stock + item.quantity}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-emerald-600 font-bold font-mono text-sm">+{item.quantity}</span>
                                                <button onClick={() => setReceiveItems(receiveItems.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-500"><Trash2 size={15} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Receipt details */}
                    <div>
                        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText size={16} /> Receipt Details</h2>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Reference # (PO/Invoice)</label>
                                <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="e.g. PO-2024-001"
                                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Supplier, delivery notes…" rows={3}
                                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                            </div>
                            <div className="bg-gray-50 rounded p-3 text-sm">
                                <div className="flex justify-between text-gray-500 mb-1"><span>Items:</span><span className="text-gray-900">{receiveItems.length}</span></div>
                                <div className="flex justify-between text-gray-500"><span>Total Qty:</span><span className="text-emerald-600 font-bold">+{totalQty}</span></div>
                            </div>
                            <button type="submit" disabled={submitting || receiveItems.length === 0}
                                className="w-full px-4 py-2.5 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 disabled:opacity-50 text-sm transition-colors">
                                {submitting ? 'Processing…' : 'Receive Stock'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
