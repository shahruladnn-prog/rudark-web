'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Package, Building2, AlertCircle, CheckCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { getStores } from '@/actions/store-actions';
import { getProducts } from '@/actions/product-actions';
import { createTransfer } from '@/actions/stock-transfer-actions';

interface Store {
    id: string;
    name: string;
    is_default?: boolean;
}

interface ProductVariant {
    sku: string;
    options: Record<string, string>;
    stock_quantity: number;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    variants?: ProductVariant[];
}

interface TransferItem {
    product_id: string;
    product_name: string;
    variant_sku?: string;
    variant_label?: string;
    quantity: number;
    current_stock: number;
}

export default function StockTransferPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Transfer state
    const [fromStore, setFromStore] = useState('');
    const [toStore, setToStore] = useState('');
    const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [notes, setNotes] = useState('');

    // Load stores and products
    const loadData = async () => {
        setLoading(true);
        try {
            const [storesData, productsData] = await Promise.all([
                getStores(),
                getProducts()
            ]);
            setStores(storesData);
            setProducts(productsData);

            // Auto-select default store as source
            const defaultStore = storesData.find((s: Store) => s.is_default);
            if (defaultStore) setFromStore(defaultStore.id);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter products by search
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add product to transfer
    const addToTransfer = (product: Product, variant?: ProductVariant) => {
        const existing = transferItems.find(
            item => item.product_id === product.id && item.variant_sku === (variant?.sku || undefined)
        );

        if (existing) return; // Already added

        const currentStock = variant?.stock_quantity ?? product.stock_quantity;
        const label = variant ? Object.values(variant.options).join(' / ') : undefined;

        setTransferItems([...transferItems, {
            product_id: product.id,
            product_name: product.name,
            variant_sku: variant?.sku,
            variant_label: label,
            quantity: 1,
            current_stock: currentStock
        }]);
        setSearchQuery('');
    };

    // Update quantity
    const updateQuantity = (index: number, qty: number) => {
        const item = transferItems[index];
        if (qty < 1 || qty > item.current_stock) return;

        const updated = [...transferItems];
        updated[index].quantity = qty;
        setTransferItems(updated);
    };

    // Remove item
    const removeItem = (index: number) => {
        setTransferItems(transferItems.filter((_, i) => i !== index));
    };

    // Submit transfer
    const handleSubmit = async () => {
        if (!fromStore || !toStore || fromStore === toStore) {
            setResult({ success: false, message: 'Please select different source and destination stores' });
            return;
        }

        if (transferItems.length === 0) {
            setResult({ success: false, message: 'Add at least one product to transfer' });
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            // Create transfer via backend
            const res = await createTransfer({
                from_store_id: fromStore,
                from_store_name: fromStoreName,
                to_store_id: toStore,
                to_store_name: toStoreName,
                items: transferItems.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    variant_sku: item.variant_sku,
                    variant_label: item.variant_label,
                    quantity: item.quantity
                })),
                notes
            });

            if (res.success) {
                setResult({
                    success: true,
                    message: `Transfer created! Reference: ${res.transferId?.slice(0, 8)}... Status: PENDING`
                });
                setTransferItems([]);
                setNotes('');
            } else {
                setResult({ success: false, message: res.error || 'Transfer failed' });
            }

        } catch (error: any) {
            setResult({ success: false, message: error.message || 'Transfer failed' });
        } finally {
            setSubmitting(false);
        }
    };

    const fromStoreName = stores.find(s => s.id === fromStore)?.name || 'Select...';
    const toStoreName = stores.find(s => s.id === toStore)?.name || 'Select...';

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-rudark-grey pb-6 mb-8">
                <Link
                    href="/admin/stock"
                    className="p-2 text-gray-400 hover:text-rudark-volt transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl md:text-4xl font-condensed font-bold text-white uppercase mb-1">
                        Stock <span className="text-rudark-volt">Transfer</span>
                    </h1>
                    <p className="text-gray-500 font-mono text-xs md:text-sm">
                        Move inventory between store locations
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading...</div>
            ) : stores.length < 2 ? (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-sm p-6 text-center">
                    <AlertCircle size={32} className="mx-auto text-yellow-400 mb-3" />
                    <h3 className="text-yellow-400 font-bold mb-2">Multiple Stores Required</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Stock transfers require at least 2 store locations.
                    </p>
                    <Link href="/admin/stores/new" className="text-rudark-volt hover:underline">
                        + Add Another Store
                    </Link>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Left: Store Selection + Products */}
                    <div className="space-y-4">
                        {/* Store Selection */}
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                            <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Transfer Direction</h2>

                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 mb-1 block">From</label>
                                    <select
                                        value={fromStore}
                                        onChange={(e) => setFromStore(e.target.value)}
                                        className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                    >
                                        <option value="">Select source...</option>
                                        {stores.map(s => (
                                            <option key={s.id} value={s.id} disabled={s.id === toStore}>
                                                {s.name} {s.is_default ? '(Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <ArrowRight size={24} className="text-rudark-volt mt-5" />

                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 mb-1 block">To</label>
                                    <select
                                        value={toStore}
                                        onChange={(e) => setToStore(e.target.value)}
                                        className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                                    >
                                        <option value="">Select destination...</option>
                                        {stores.map(s => (
                                            <option key={s.id} value={s.id} disabled={s.id === fromStore}>
                                                {s.name} {s.is_default ? '(Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Product Search */}
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                            <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">Add Products</h2>

                            <div className="flex items-center gap-2 bg-rudark-matte border border-rudark-grey rounded-sm px-3 mb-3">
                                <Search size={16} className="text-gray-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products..."
                                    className="flex-1 bg-transparent text-white text-sm py-2 focus:outline-none"
                                />
                            </div>

                            {/* Search Results */}
                            {searchQuery && (
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {filteredProducts.length === 0 ? (
                                        <div className="text-gray-500 text-sm text-center py-4">No products found</div>
                                    ) : (
                                        filteredProducts.slice(0, 10).map(product => (
                                            <div key={product.id} className="border border-rudark-grey rounded-sm p-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-white text-sm font-medium">{product.name}</div>
                                                        <div className="text-xs text-gray-500 font-mono">{product.sku}</div>
                                                    </div>
                                                    {(!product.variants || product.variants.length === 0) && (
                                                        <button
                                                            onClick={() => addToTransfer(product)}
                                                            className="text-xs px-2 py-1 bg-rudark-volt text-black rounded-sm font-bold"
                                                        >
                                                            + Add
                                                        </button>
                                                    )}
                                                </div>
                                                {product.variants && product.variants.length > 0 && (
                                                    <div className="mt-2 grid grid-cols-2 gap-1">
                                                        {product.variants.map(v => (
                                                            <button
                                                                key={v.sku}
                                                                onClick={() => addToTransfer(product, v)}
                                                                className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded hover:bg-rudark-volt hover:text-black"
                                                            >
                                                                {Object.values(v.options).join('/')} ({v.stock_quantity})
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Transfer Summary */}
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                        <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Transfer Summary</h2>

                        {/* Direction Display */}
                        <div className="flex items-center justify-center gap-2 bg-rudark-matte p-3 rounded-sm mb-4">
                            <Building2 size={16} className="text-gray-400" />
                            <span className="text-white text-sm">{fromStoreName}</span>
                            <ArrowRight size={16} className="text-rudark-volt" />
                            <span className="text-white text-sm">{toStoreName}</span>
                        </div>

                        {/* Items */}
                        {transferItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                No items added yet.<br />
                                Search and add products above.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                                {transferItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-rudark-matte rounded-sm">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white text-sm truncate">{item.product_name}</div>
                                            {item.variant_label && (
                                                <div className="text-xs text-gray-500">{item.variant_label}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(idx, item.quantity - 1)}
                                                className="w-6 h-6 bg-gray-700 text-white rounded text-sm"
                                            >−</button>
                                            <span className="w-8 text-center text-white font-mono">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                                                className="w-6 h-6 bg-gray-700 text-white rounded text-sm"
                                            >+</button>
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="ml-2 text-red-400 hover:text-red-300 text-xs"
                                            >✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Notes */}
                        <div className="mb-4">
                            <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Transfer reason, reference..."
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-2 text-white text-sm focus:border-rudark-volt focus:outline-none resize-none"
                            />
                        </div>

                        {/* Result */}
                        {result && (
                            <div className={`p-3 rounded-sm flex items-center gap-2 mb-4 ${result.success ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'
                                }`}>
                                {result.success ?
                                    <CheckCircle size={18} className="text-green-400" /> :
                                    <AlertCircle size={18} className="text-red-400" />
                                }
                                <span className={result.success ? 'text-green-400' : 'text-red-400'} style={{ fontSize: '0.875rem' }}>
                                    {result.message}
                                </span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !fromStore || !toStore || transferItems.length === 0}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-rudark-volt text-black font-bold rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Package size={18} />
                                    Create Transfer ({transferItems.reduce((sum, i) => sum + i.quantity, 0)} units)
                                </>
                            )}
                        </button>

                        {/* Status Note */}
                        <div className="mt-3 text-xs text-gray-500 text-center">
                            <Clock size={12} className="inline mr-1" />
                            Transfers require approval before processing
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
