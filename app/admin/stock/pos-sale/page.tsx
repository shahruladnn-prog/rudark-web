'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Package, Plus, Trash2, Check, DollarSign } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { recordStockMovement } from '@/actions/stock-movement-actions';

interface ProductOption {
    id: string;
    name: string;
    sku: string;
    pos_price: number;
    web_price: number;
    stock_quantity: number;
    variants?: Array<{
        sku: string;
        options: Record<string, string>;
        stock_quantity?: number;
        price?: number;
    }>;
}

interface SaleItem {
    product_id: string;
    product_name: string;
    sku: string;
    variant_sku?: string;
    variant_label?: string;
    unit_price: number;
    quantity: number;
    current_stock: number;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'ewallet', label: 'E-Wallet' },
    { value: 'qr', label: 'QR Pay' },
    { value: 'transfer', label: 'Bank Transfer' },
];

export default function POSSalesPage() {
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Sale items
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Add item form
    const [addingProduct, setAddingProduct] = useState('');
    const [addingVariant, setAddingVariant] = useState('');
    const [addingQuantity, setAddingQuantity] = useState(1);

    // Sale details
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [receiptNumber, setReceiptNumber] = useState('');
    const [notes, setNotes] = useState('');

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
                pos_price: p.pos_price || p.price || 0,
                web_price: p.web_price || p.price || 0,
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

        const unitPrice = variant?.price ?? product.pos_price;

        const variantLabel = variant
            ? Object.values(variant.options).join(' / ')
            : undefined;

        // Check if already added
        const existingIndex = saleItems.findIndex(item =>
            item.product_id === addingProduct &&
            item.variant_sku === (addingVariant || undefined)
        );

        if (existingIndex >= 0) {
            const updated = [...saleItems];
            updated[existingIndex].quantity += addingQuantity;
            setSaleItems(updated);
        } else {
            setSaleItems([...saleItems, {
                product_id: addingProduct,
                product_name: product.name,
                sku: product.sku,
                variant_sku: addingVariant || undefined,
                variant_label: variantLabel,
                unit_price: unitPrice,
                quantity: addingQuantity,
                current_stock: currentStock
            }]);
        }

        setAddingProduct('');
        setAddingVariant('');
        setAddingQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        setSaleItems(saleItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (saleItems.length === 0) {
            alert('Please add at least one item');
            return;
        }

        // Validate stock
        for (const item of saleItems) {
            if (item.quantity > item.current_stock) {
                alert(`Insufficient stock for ${item.product_name}. Available: ${item.current_stock}`);
                return;
            }
        }

        setSubmitting(true);
        try {
            // Record each sale item
            for (const item of saleItems) {
                await recordStockMovement({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_sku: item.variant_sku,
                    variant_label: item.variant_label,
                    type: 'SALE',
                    quantity: -item.quantity, // Negative for deduction
                    previous_quantity: item.current_stock,
                    new_quantity: item.current_stock - item.quantity,
                    reason: `POS Sale - ${paymentMethod}${receiptNumber ? ` - Receipt: ${receiptNumber}` : ''}`,
                    reference: receiptNumber || undefined,
                    created_by: 'admin'
                });
            }

            setSuccess(true);
            setSaleItems([]);
            setPaymentMethod('cash');
            setReceiptNumber('');
            setNotes('');
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            alert('Error recording sale: ' + error);
        }
        setSubmitting(false);
    };

    const totalAmount = saleItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="border-b border-rudark-grey pb-6 mb-8">
                <Link href="/admin/stock" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
                    <ArrowLeft size={16} />
                    Back to Stock
                </Link>
                <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                    Record <span className="text-orange-400">POS Sale</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Manually record physical store sales for stock deduction
                </p>
            </div>

            {/* Success Message */}
            {success && (
                <div className="bg-green-900/30 border border-green-500/50 rounded-sm p-4 mb-6 flex items-center gap-3">
                    <Check size={20} className="text-green-400" />
                    <span className="text-green-400">Sale recorded successfully. Stock has been updated.</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Add Items */}
                        <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-orange-400" />
                                Add Items
                            </h2>

                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm mb-4"
                            />

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="col-span-2 md:col-span-1">
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
                                                {product.name} (Stock: {product.stock_quantity})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                                    <div className="col-span-2 md:col-span-1">
                                        <select
                                            value={addingVariant}
                                            onChange={(e) => setAddingVariant(e.target.value)}
                                            className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                        >
                                            <option value="">-- Select Variant --</option>
                                            {selectedProduct.variants.map(variant => {
                                                const label = Object.values(variant.options || {}).join(' / ');
                                                return (
                                                    <option key={variant.sku} value={variant.sku}>
                                                        {label || variant.sku} (Stock: {variant.stock_quantity ?? 0})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <input
                                        type="number"
                                        min={1}
                                        value={addingQuantity}
                                        onChange={(e) => setAddingQuantity(parseInt(e.target.value) || 1)}
                                        placeholder="Qty"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>

                                <div>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={!addingProduct}
                                        className="w-full px-4 py-3 bg-orange-600 text-white font-bold uppercase rounded-sm hover:bg-orange-500 disabled:opacity-50"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                <ShoppingBag size={20} />
                                Sale Items ({saleItems.length})
                            </h2>

                            {saleItems.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No items added yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {saleItems.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center p-4 bg-rudark-matte rounded-sm">
                                            <div>
                                                <div className="text-white font-medium">{item.product_name}</div>
                                                {item.variant_label && (
                                                    <div className="text-gray-400 text-xs">{item.variant_label}</div>
                                                )}
                                                <div className="text-gray-500 text-xs">
                                                    RM {item.unit_price.toFixed(2)} × {item.quantity}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-white font-bold">{item.quantity} pcs</div>
                                                    <div className="text-orange-400 text-sm font-mono">
                                                        RM {(item.quantity * item.unit_price).toFixed(2)}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
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

                    {/* Right Column - Sale Details & Summary */}
                    <div className="space-y-6">
                        {/* Sale Details */}
                        <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                                <DollarSign size={20} />
                                Sale Details
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    >
                                        {PAYMENT_METHODS.map(pm => (
                                            <option key={pm.value} value={pm.value}>{pm.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Receipt/Reference #</label>
                                    <input
                                        type="text"
                                        value={receiptNumber}
                                        onChange={(e) => setReceiptNumber(e.target.value)}
                                        placeholder="e.g., Loyverse receipt #"
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Any notes..."
                                        className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-rudark-carbon p-6 border border-orange-500/30 rounded-sm">
                            <h2 className="text-lg font-bold text-white uppercase mb-4">Summary</h2>

                            <div className="space-y-3">
                                <div className="flex justify-between text-gray-400">
                                    <span>Items:</span>
                                    <span className="text-white">{saleItems.length}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Total Qty:</span>
                                    <span className="text-white">{totalItems}</span>
                                </div>
                                <div className="flex justify-between text-gray-400 pt-3 border-t border-rudark-grey">
                                    <span>Total:</span>
                                    <span className="text-orange-400 font-bold text-xl font-mono">
                                        RM {totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || saleItems.length === 0}
                                className="w-full mt-6 px-6 py-3 bg-orange-600 text-white font-bold uppercase rounded-sm hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Processing...' : (
                                    <>
                                        <Check size={18} />
                                        Record Sale
                                    </>
                                )}
                            </button>

                            <p className="text-gray-500 text-xs text-center mt-3">
                                Stock will be deducted immediately
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
