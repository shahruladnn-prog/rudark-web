'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { createPurchaseOrder, getNextPOReference, POItem } from '@/actions/purchase-order-actions';
import { getProductsForAdjustment } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

export default function NewPurchaseOrderPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [reference, setReference] = useState('');
    const [supplier, setSupplier] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItem[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getNextPOReference().then(setReference);
        getProductsForAdjustment().then(setProducts);
    }, []);

    const addItem = () => {
        setItems(prev => [...prev, {
            product_id: '',
            product_name: '',
            variant_sku: undefined,
            variant_label: undefined,
            ordered_qty: 0,
            received_qty: 0,
        }]);
    };

    const updateItem = (index: number, field: string, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const selectProduct = (index: number, productId: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const updated = [...items];
        updated[index] = {
            ...updated[index],
            product_id: productId,
            product_name: product.name,
            variant_sku: undefined,
            variant_label: undefined,
        };
        setItems(updated);
    };

    const selectVariant = (index: number, variantSku: string) => {
        const product = products.find(p => p.id === items[index].product_id);
        if (!product) return;
        const variant = product.variants.find((v: any) => v.sku === variantSku);
        const updated = [...items];
        updated[index] = {
            ...updated[index],
            variant_sku: variantSku,
            variant_label: variant?.label || variantSku,
        };
        setItems(updated);
    };

    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async (status: 'DRAFT' | 'ORDERED') => {
        if (!supplier.trim()) { showToast('error', 'Enter supplier name'); return; }
        if (items.length === 0) { showToast('error', 'Add at least one item'); return; }
        const validItems = items.filter(i => i.product_id && i.ordered_qty > 0);
        if (validItems.length === 0) { showToast('error', 'All items need a product and quantity > 0'); return; }

        setSaving(true);
        const res = await createPurchaseOrder({
            reference,
            supplier_name: supplier,
            status,
            expected_date: expectedDate || undefined,
            notes: notes || undefined,
            items: validItems,
        });

        if (res.success) {
            showToast('success', `PO ${status === 'ORDERED' ? 'placed' : 'saved as draft'}`);
            router.push(`/admin/stock/purchase-orders/${res.id}`);
        } else {
            showToast('error', res.error || 'Failed to create PO');
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock/purchase-orders" className="p-2 text-gray-400 hover:text-gray-600">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">New Purchase Order</h1>
                    <p className="text-sm text-gray-400">Order stock from a supplier</p>
                </div>
            </div>

            <div className="space-y-5">

                {/* Header fields */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PO Reference</label>
                            <input
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Supplier Name *</label>
                            <input
                                value={supplier}
                                onChange={e => setSupplier(e.target.value)}
                                placeholder="e.g. ABC Trading Sdn Bhd"
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Expected Delivery Date</label>
                            <input
                                type="date"
                                value={expectedDate}
                                onChange={e => setExpectedDate(e.target.value)}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notes</label>
                            <input
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Optional notes"
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Line items */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-gray-700">Items to Order</h2>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
                        >
                            <Plus size={13} /> Add Item
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-gray-200 rounded text-gray-400 text-sm">
                            No items yet — click "Add Item" to start
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item, i) => {
                                const selectedProduct = products.find(p => p.id === item.product_id);
                                return (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded border border-gray-100">
                                        {/* Product */}
                                        <div className="col-span-5">
                                            <label className="block text-[10px] text-gray-400 uppercase mb-1">Product</label>
                                            <select
                                                value={item.product_id}
                                                onChange={e => selectProduct(i, e.target.value)}
                                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white"
                                            >
                                                <option value="">Select product…</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Variant */}
                                        <div className="col-span-4">
                                            <label className="block text-[10px] text-gray-400 uppercase mb-1">Variant</label>
                                            <select
                                                value={item.variant_sku || ''}
                                                onChange={e => selectVariant(i, e.target.value)}
                                                disabled={!selectedProduct?.variants?.length}
                                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                                            >
                                                <option value="">{selectedProduct?.variants?.length ? 'Select variant…' : 'No variants'}</option>
                                                {(selectedProduct?.variants || []).map((v: any) => (
                                                    <option key={v.sku} value={v.sku}>{v.label} ({v.sku})</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Qty */}
                                        <div className="col-span-2">
                                            <label className="block text-[10px] text-gray-400 uppercase mb-1">Qty</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.ordered_qty || ''}
                                                onChange={e => updateItem(i, 'ordered_qty', parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:border-blue-400"
                                            />
                                        </div>

                                        {/* Delete */}
                                        <div className="col-span-1 flex items-end pb-0.5">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(i)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => handleSave('DRAFT')}
                        disabled={saving}
                        className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded text-sm font-medium hover:border-gray-300 disabled:opacity-50"
                    >
                        Save as Draft
                    </button>
                    <button
                        onClick={() => handleSave('ORDERED')}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Save size={15} /> Place Order
                    </button>
                </div>
            </div>
        </div>
    );
}
