'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Package, Camera, Check } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { recordStockMovement } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

interface ProductOption {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    variants?: Array<{
        sku: string;
        options: Record<string, string>;
        stock_quantity?: number;
    }>;
}

const DAMAGE_REASONS = [
    { value: 'warehouse_damage', label: 'Warehouse Damage' },
    { value: 'transit_damage', label: 'Transit/Shipping Damage' },
    { value: 'defective_supplier', label: 'Defective from Supplier' },
    { value: 'customer_return_damaged', label: 'Customer Return (Damaged)' },
    { value: 'lost_missing', label: 'Lost/Missing Inventory' },
    { value: 'expired', label: 'Expired/Past Sell Date' },
    { value: 'quality_control', label: 'Failed Quality Control' },
    { value: 'other', label: 'Other (specify in notes)' },
];

export default function DamageRecordingPage() {
    const { showToast } = useToast();
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form state
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [selectedVariant, setSelectedVariant] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data.map((p: any) => ({
                id: p.id,
                name: p.name || 'Unnamed',
                sku: p.sku || '',
                stock_quantity: p.stock_quantity ?? 0,
                variants: p.variants || []
            })));
        } catch (error) {
            console.error('Failed to load products:', error);
        }
        setLoading(false);
    };

    const selectedProductData = products.find(p => p.id === selectedProduct);
    const selectedVariantData = selectedProductData?.variants?.find(v => v.sku === selectedVariant);

    const currentStock = selectedVariant && selectedVariantData
        ? selectedVariantData.stock_quantity ?? 0
        : selectedProductData?.stock_quantity ?? 0;

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !reason || quantity < 1) {
            showToast('warning', 'Please fill in all required fields');
            return;
        }

        if (quantity > currentStock) {
            showToast('warning', `Cannot record damage of ${quantity} items. Current stock is only ${currentStock}.`);
            return;
        }

        setSubmitting(true);
        try {
            const product = products.find(p => p.id === selectedProduct);
            const variantLabel = selectedVariantData
                ? Object.values(selectedVariantData.options).join(' / ')
                : undefined;

            const result = await recordStockMovement({
                product_id: selectedProduct,
                product_name: product?.name || 'Unknown',
                variant_sku: selectedVariant || undefined,
                variant_label: variantLabel,
                type: 'DAMAGE',
                quantity: -quantity, // Negative because we're reducing stock
                previous_quantity: currentStock,
                new_quantity: currentStock - quantity,
                reason: `${DAMAGE_REASONS.find(r => r.value === reason)?.label || reason}${notes ? ': ' + notes : ''}`,
                created_by: 'admin'
            });

            if (result.success) {
                setSuccess(true);
                // Reset form
                setSelectedProduct('');
                setSelectedVariant('');
                setQuantity(1);
                setReason('');
                setNotes('');
                setTimeout(() => setSuccess(false), 3000);
            } else {
                showToast('error', 'Failed to record damage: ' + result.error);
            }
        } catch (error) {
            showToast('error', 'Error recording damage: ' + error);
        }
        setSubmitting(false);
    };

    return (
        <div className="max-w-3xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Record Damage / Loss</h1>
                    <p className="text-sm text-gray-400">Document damaged, lost, or defective inventory items</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Selection */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Package size={16} /> Select Product</h2>
                    <input type="text" placeholder="Filter products…" value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400" />
                    <select value={selectedProduct} onChange={e => { setSelectedProduct(e.target.value); setSelectedVariant(''); }}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400" required>
                        <option value="">— Select Product —</option>
                        {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — Stock: {p.stock_quantity}</option>)}
                    </select>
                    {selectedProductData?.variants && selectedProductData.variants.length > 0 && (
                        <select value={selectedVariant} onChange={e => setSelectedVariant(e.target.value)}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400">
                            <option value="">— No specific variant —</option>
                            {selectedProductData.variants.map(v => (
                                <option key={v.sku} value={v.sku}>{Object.values(v.options || {}).join(' / ') || v.sku} — Stock: {v.stock_quantity ?? 0}</option>
                            ))}
                        </select>
                    )}
                    {selectedProduct && (
                        <div className="p-3 bg-gray-50 rounded border border-gray-100 text-sm">
                            Current Stock: <span className="font-bold text-gray-900">{currentStock}</span>
                        </div>
                    )}
                </div>

                {/* Damage Details */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Damage Details</h2>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Quantity Damaged *</label>
                            <input type="number" min={1} max={currentStock} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" required />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Reason *</label>
                            <select value={reason} onChange={e => setReason(e.target.value)}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" required>
                                <option value="">— Select Reason —</option>
                                {DAMAGE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details about the damage…" rows={3}
                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                    </div>
                    <div className="mt-3 p-3 border-2 border-dashed border-gray-200 rounded text-center">
                        <Camera size={24} className="mx-auto text-gray-300 mb-1" />
                        <p className="text-gray-400 text-xs">Photo upload coming soon</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Link href="/admin/stock" className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300">Cancel</Link>
                    <button type="submit" disabled={submitting || !selectedProduct || !reason}
                        className="px-6 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700 disabled:opacity-50 text-sm transition-colors">
                        {submitting ? 'Recording…' : 'Record Damage'}
                    </button>
                </div>
            </form>
        </div>
    );
}
