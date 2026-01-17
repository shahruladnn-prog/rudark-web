'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, Plus, Trash2, Check, FileText } from 'lucide-react';
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

interface ReceiveItem {
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    quantity: number;
    current_stock: number;
}

export default function StockReceivingPage() {
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form state
    const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);
    const [referenceNumber, setReferenceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Add item form
    const [addingProduct, setAddingProduct] = useState('');
    const [addingVariant, setAddingVariant] = useState('');
    const [addingQuantity, setAddingQuantity] = useState(1);

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

    const selectedProduct = products.find(p => p.id === addingProduct);
    const selectedVariant = selectedProduct?.variants?.find(v => v.sku === addingVariant);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddItem = () => {
        if (!addingProduct || addingQuantity < 1) return;

        const product = products.find(p => p.id === addingProduct);
        if (!product) return;

        const variant = addingVariant
            ? product.variants?.find(v => v.sku === addingVariant)
            : null;

        const currentStock = variant
            ? (variant.stock_quantity ?? 0)
            : product.stock_quantity;

        const variantLabel = variant
            ? Object.values(variant.options).join(' / ')
            : undefined;

        // Check if already added
        const existingIndex = receiveItems.findIndex(item =>
            item.product_id === addingProduct &&
            item.variant_sku === (addingVariant || undefined)
        );

        if (existingIndex >= 0) {
            // Update existing
            const updated = [...receiveItems];
            updated[existingIndex].quantity += addingQuantity;
            setReceiveItems(updated);
        } else {
            // Add new
            setReceiveItems([...receiveItems, {
                product_id: addingProduct,
                product_name: product.name,
                variant_sku: addingVariant || undefined,
                variant_label: variantLabel,
                quantity: addingQuantity,
                current_stock: currentStock
            }]);
        }

        // Reset add form
        setAddingProduct('');
        setAddingVariant('');
        setAddingQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        setReceiveItems(receiveItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (receiveItems.length === 0) {
            alert('Please add at least one item to receive');
            return;
        }

        setSubmitting(true);
        try {
            // Record each item
            for (const item of receiveItems) {
                await recordStockMovement({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_sku: item.variant_sku,
                    variant_label: item.variant_label,
                    type: 'RECEIVE',
                    quantity: item.quantity, // Positive = adding stock
                    previous_quantity: item.current_stock,
                    new_quantity: item.current_stock + item.quantity,
                    reason: notes || 'Stock received',
                    reference: referenceNumber || undefined,
                    created_by: 'admin'
                });
            }

            setSuccess(true);
            setReceiveItems([]);
            setReferenceNumber('');
            setNotes('');
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            alert('Error receiving stock: ' + error);
        }
        setSubmitting(false);
    };

    const totalItemsToReceive = receiveItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="border-b border-rudark-grey pb-6 mb-8">
                <Link href="/admin/stock" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
                    <ArrowLeft size={16} />
                    Back to Stock
                </Link>
                <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                    Stock <span className="text-green-400">Receiving</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Record incoming inventory from suppliers
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="bg-green-900/30 border border-green-500/50 rounded-sm p-4 mb-6 flex items-center gap-3">
                    <Check size={20} className="text-green-400" />
                    <span className="text-green-400">Stock received successfully. Inventory has been updated.</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add Items Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-green-400" />
                            Add Items to Receive
                        </h2>

                        {/* Search */}
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm mb-4"
                        />

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Product */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-gray-400 text-sm mb-2">Product</label>
                                <select
                                    value={addingProduct}
                                    onChange={(e) => {
                                        setAddingProduct(e.target.value);
                                        setAddingVariant('');
                                    }}
                                    className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                >
                                    <option value="">-- Select Product --</option>
                                    {filteredProducts.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Variant */}
                            {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-gray-400 text-sm mb-2">Variant</label>
                                    <select
                                        value={addingVariant}
                                        onChange={(e) => setAddingVariant(e.target.value)}
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    >
                                        <option value="">-- No variant --</option>
                                        {selectedProduct.variants.map(variant => {
                                            const label = Object.values(variant.options || {}).join(' / ');
                                            return (
                                                <option key={variant.sku} value={variant.sku}>
                                                    {label || variant.sku}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Quantity</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={addingQuantity}
                                    onChange={(e) => setAddingQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                />
                            </div>

                            {/* Add Button */}
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    disabled={!addingProduct}
                                    className="px-6 py-3 bg-green-600 text-white font-bold uppercase rounded-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add Item
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                            <Package size={20} />
                            Items to Receive ({receiveItems.length})
                        </h2>

                        {receiveItems.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No items added yet</p>
                        ) : (
                            <div className="space-y-3">
                                {receiveItems.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 bg-rudark-matte rounded-sm">
                                        <div>
                                            <div className="text-white font-medium">{item.product_name}</div>
                                            {item.variant_label && (
                                                <div className="text-gray-400 text-xs">{item.variant_label}</div>
                                            )}
                                            <div className="text-gray-500 text-xs">
                                                Current: {item.current_stock} → New: {item.current_stock + item.quantity}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-green-400 font-bold">+{item.quantity}</span>
                                            <button
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Receipt Details */}
                <div className="space-y-6">
                    <form onSubmit={handleSubmit} className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                            <FileText size={20} />
                            Receipt Details
                        </h2>

                        {/* Reference Number */}
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Reference # (PO/Invoice)</label>
                            <input
                                type="text"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                placeholder="e.g., PO-2024-001"
                                className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                            />
                        </div>

                        {/* Notes */}
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Supplier name, delivery notes..."
                                className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                rows={3}
                            />
                        </div>

                        {/* Summary */}
                        <div className="p-4 bg-rudark-matte rounded-sm mb-4">
                            <div className="flex justify-between text-gray-400 mb-2">
                                <span>Items:</span>
                                <span className="text-white">{receiveItems.length}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                                <span>Total Qty:</span>
                                <span className="text-green-400 font-bold">+{totalItemsToReceive}</span>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || receiveItems.length === 0}
                            className="w-full px-6 py-3 bg-green-600 text-white font-bold uppercase rounded-sm hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Processing...' : 'Receive Stock'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
