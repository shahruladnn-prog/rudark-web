'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Package, Camera, Check } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { recordStockMovement } from '@/actions/stock-movement-actions';

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
            alert('Please fill in all required fields');
            return;
        }

        if (quantity > currentStock) {
            alert(`Cannot record damage of ${quantity} items. Current stock is only ${currentStock}.`);
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
                alert('Failed to record damage: ' + result.error);
            }
        } catch (error) {
            alert('Error recording damage: ' + error);
        }
        setSubmitting(false);
    };

    return (
        <div className="max-w-3xl mx-auto pb-20">
            {/* Header */}
            <div className="border-b border-rudark-grey pb-6 mb-8">
                <Link href="/admin/stock" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
                    <ArrowLeft size={16} />
                    Back to Stock
                </Link>
                <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                    Record <span className="text-red-400">Damage / Loss</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Document damaged, lost, or defective inventory items
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="bg-green-900/30 border border-green-500/50 rounded-sm p-4 mb-6 flex items-center gap-3">
                    <Check size={20} className="text-green-400" />
                    <span className="text-green-400">Damage recorded successfully. Stock has been updated.</span>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Selection */}
                <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                    <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                        <Package size={20} />
                        Select Product
                    </h2>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm mb-4"
                    />

                    {/* Product Dropdown */}
                    <select
                        value={selectedProduct}
                        onChange={(e) => {
                            setSelectedProduct(e.target.value);
                            setSelectedVariant('');
                        }}
                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                        required
                    >
                        <option value="">-- Select Product --</option>
                        {filteredProducts.map(product => (
                            <option key={product.id} value={product.id}>
                                {product.name} ({product.sku}) - Stock: {product.stock_quantity}
                            </option>
                        ))}
                    </select>

                    {/* Variant Selection */}
                    {selectedProductData?.variants && selectedProductData.variants.length > 0 && (
                        <div className="mt-4">
                            <label className="block text-gray-400 text-sm mb-2">Select Variant (if applicable)</label>
                            <select
                                value={selectedVariant}
                                onChange={(e) => setSelectedVariant(e.target.value)}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                            >
                                <option value="">-- No specific variant (parent level) --</option>
                                {selectedProductData.variants.map(variant => {
                                    const label = Object.values(variant.options || {}).join(' / ');
                                    return (
                                        <option key={variant.sku} value={variant.sku}>
                                            {label || variant.sku} - Stock: {variant.stock_quantity ?? 0}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* Current Stock Display */}
                    {selectedProduct && (
                        <div className="mt-4 p-3 bg-rudark-matte rounded-sm">
                            <span className="text-gray-400">Current Stock: </span>
                            <span className="text-white font-bold">{currentStock}</span>
                        </div>
                    )}
                </div>

                {/* Damage Details */}
                <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                    <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-400" />
                        Damage Details
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Quantity */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Quantity Damaged *</label>
                            <input
                                type="number"
                                min={1}
                                max={currentStock}
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                required
                            />
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-2">Reason *</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                required
                            >
                                <option value="">-- Select Reason --</option>
                                {DAMAGE_REASONS.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional details about the damage..."
                            className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                            rows={3}
                        />
                    </div>

                    {/* Photo Upload Placeholder */}
                    <div className="mt-4 p-4 border-2 border-dashed border-rudark-grey rounded-sm text-center">
                        <Camera size={32} className="mx-auto text-gray-500 mb-2" />
                        <p className="text-gray-500 text-sm">Photo upload coming soon</p>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-4">
                    <Link
                        href="/admin/stock"
                        className="px-6 py-3 border border-rudark-grey text-gray-300 hover:text-white rounded-sm"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting || !selectedProduct || !reason}
                        className="px-6 py-3 bg-red-600 text-white font-bold uppercase rounded-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Recording...' : 'Record Damage'}
                    </button>
                </div>
            </form>
        </div>
    );
}
