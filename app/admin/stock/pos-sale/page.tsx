'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Package, Plus, Trash2, Check, DollarSign } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { recordStockMovement } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

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
    const { showToast } = useToast();
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
            showToast('warning', 'Please add at least one item');
            return;
        }

        // Validate stock
        for (const item of saleItems) {
            if (item.quantity > item.current_stock) {
                showToast('warning', `Insufficient stock for ${item.product_name}. Available: ${item.current_stock}`);
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
            showToast('error', 'Error recording sale: ' + error);
        }
        setSubmitting(false);
    };

    const totalAmount = saleItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="max-w-5xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Record POS Sale</h1>
                    <p className="text-sm text-gray-400">Manually record physical store sales for stock deduction</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Add Items */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Plus size={16} className="text-orange-500" /> Add Items</h2>
                            <input type="text" placeholder="Filter products…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2 md:col-span-1">
                                    <select value={addingProduct} onChange={e => { setAddingProduct(e.target.value); setAddingVariant(''); }}
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                                        <option value="">— Select Product —</option>
                                        {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</option>)}
                                    </select>
                                </div>
                                {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                                    <div className="col-span-2 md:col-span-1">
                                        <select value={addingVariant} onChange={e => setAddingVariant(e.target.value)}
                                            className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                                            <option value="">— Select Variant —</option>
                                            {selectedProduct.variants.map(v => <option key={v.sku} value={v.sku}>{Object.values(v.options || {}).join(' / ') || v.sku} (Stock: {v.stock_quantity ?? 0})</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <input type="number" min={1} value={addingQuantity} onChange={e => setAddingQuantity(parseInt(e.target.value) || 1)} placeholder="Qty"
                                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                                </div>
                                <div>
                                    <button type="button" onClick={handleAddItem} disabled={!addingProduct}
                                        className="w-full px-4 py-2 bg-orange-500 text-white font-medium rounded hover:bg-orange-600 disabled:opacity-50 text-sm">
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><ShoppingBag size={16} /> Sale Items ({saleItems.length})</h2>
                            {saleItems.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-6">No items added yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {saleItems.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                                {item.variant_label && <div className="text-xs text-gray-400">{item.variant_label}</div>}
                                                <div className="text-xs text-gray-400">RM {item.unit_price.toFixed(2)} × {item.quantity}</div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold text-gray-900">{item.quantity} pcs</div>
                                                    <div className="text-orange-500 text-xs font-mono">RM {(item.quantity * item.unit_price).toFixed(2)}</div>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveItem(i)} className="text-red-400 hover:text-red-500"><Trash2 size={15} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right */}
                    <div className="space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
                            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><DollarSign size={16} /> Sale Details</h2>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Payment Method</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                                    {PAYMENT_METHODS.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Receipt/Reference #</label>
                                <input type="text" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} placeholder="e.g. Loyverse receipt #"
                                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes…" rows={2}
                                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                            </div>
                        </div>

                        <div className="bg-white border border-orange-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Summary</h2>
                            <div className="space-y-2 text-sm mb-4">
                                <div className="flex justify-between text-gray-500"><span>Items:</span><span className="text-gray-900">{saleItems.length}</span></div>
                                <div className="flex justify-between text-gray-500"><span>Total Qty:</span><span className="text-gray-900">{totalItems}</span></div>
                                <div className="flex justify-between text-gray-500 pt-2 border-t border-gray-100">
                                    <span>Total:</span>
                                    <span className="text-orange-600 font-bold font-mono">RM {totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                            <button type="submit" disabled={submitting || saleItems.length === 0}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-500 text-white font-medium rounded hover:bg-orange-600 disabled:opacity-50 text-sm">
                                {submitting ? 'Processing…' : <><Check size={15} /> Record Sale</>}
                            </button>
                            <p className="text-gray-400 text-xs text-center mt-2">Stock will be deducted immediately</p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
