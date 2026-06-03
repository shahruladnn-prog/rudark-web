'use client';

import React, { useState, useEffect } from 'react';
import { initializeStockFields } from '@/actions/sync-stock';
import { cleanupExpiredReservations } from '@/actions/stock-cleanup';
import { resetAllReservedQuantities, repairVariantOptionKeys } from '@/actions/stock-validation';
import { getProducts } from '@/actions/product-actions';
import { useToast } from '@/components/ui/toast';
import {
    RefreshCw, Database, CheckCircle, AlertCircle, Search,
    Package, AlertTriangle, ChevronDown, ChevronRight, Edit2, Download
} from 'lucide-react';

function exportStockCsv(products: ProductStock[]) {
    const rows: string[] = [
        'Product,SKU,Variant,Variant SKU,Stock,Reserved,Available,Price (RM)',
    ];
    for (const p of products) {
        if (!p.variants?.length) {
            const a = (p.stock_quantity ?? 0) - (p.reserved_quantity ?? 0);
            rows.push([`"${p.name}"`, p.sku, '', '', p.stock_quantity, p.reserved_quantity, a, p.price.toFixed(2)].join(','));
        } else {
            for (const v of p.variants) {
                const va = (v.stock_quantity ?? 0) - (v.reserved_quantity ?? 0);
                const label = Object.values(v.options || {}).join(' / ') || v.sku;
                rows.push([`"${p.name}"`, p.sku, `"${label}"`, v.sku, v.stock_quantity ?? 0, v.reserved_quantity ?? 0, va, (v.price || p.price).toFixed(2)].join(','));
            }
        }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
import Link from 'next/link';

interface ProductVariant {
    sku: string;
    options: Record<string, string>;
    price: number;
    promo_price?: number;
    stock_quantity?: number;
    reserved_quantity?: number;
    stock_status?: string;
}

interface ProductStock {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    reserved_quantity: number;
    price: number;
    category: string;
    variants: ProductVariant[];
    reorder_point?: number;
    safety_stock?: number;
}

export default function StockManagementPage() {
    const { showToast } = useToast();
    const [initializing, setInitializing] = useState(false);
    const [resettingReserved, setResettingReserved] = useState(false);
    const [repairingOptions, setRepairingOptions] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [products, setProducts] = useState<ProductStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data.map((p: any) => ({
                id: p.id,
                name: p.name || 'Unnamed',
                sku: p.sku || '-',
                stock_quantity: p.stock_quantity ?? 0,
                reserved_quantity: p.reserved_quantity ?? 0,
                price: p.price || p.web_price || 0,
                category: p.category || p.category_slug || '-',
                variants: p.variants || [],
                reorder_point: p.reorder_point,
                safety_stock: p.safety_stock
            })));
        } catch {
            showToast('error', 'Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cleanupExpiredReservations(30).catch(() => {});
        loadProducts();
    }, []);

    const handleInitialize = async () => {
        setInitializing(true);
        setResult(null);
        const res = await initializeStockFields();
        setResult(res);
        setInitializing(false);
        if (res.success) showToast('success', `Initialized ${(res as any).initialized ?? 0} products`);
        else showToast('error', (res as any).error || 'Initialization failed');
        loadProducts();
    };

    const handleRepairOptions = async () => {
        if (!confirm('Normalize all variant option keys to match product option names?\n\nThis is safe to run at any time and fixes the Loyverse import key mismatch that prevents variant buttons from showing stock. Run this once after any Loyverse import.')) return;
        setRepairingOptions(true);
        try {
            const res = await repairVariantOptionKeys();
            if (res.success) {
                showToast('success', `Repaired ${res.fixed} product(s). Variant options are now normalized.`);
                loadProducts();
            } else {
                showToast('error', 'Repair failed');
            }
        } catch (e: any) {
            showToast('error', e.message || 'Repair failed');
        } finally {
            setRepairingOptions(false);
        }
    };

    const handleResetReserved = async () => {
        if (!confirm('Reset ALL reserved quantities to 0? This releases all pending stock reservations from abandoned checkouts. Only do this if customers are unable to buy items that should be in stock.')) return;
        setResettingReserved(true);
        try {
            const res = await resetAllReservedQuantities();
            if (res.success) {
                showToast('success', `Reset reserved quantities on ${res.fixed} product(s). Stock is now available for purchase.`);
                loadProducts();
            } else {
                showToast('error', 'Reset failed');
            }
        } catch (e: any) {
            showToast('error', e.message || 'Reset failed');
        } finally {
            setResettingReserved(false);
        }
    };

    const toggleExpand = (id: string) => {
        const next = new Set(expandedProducts);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpandedProducts(next);
    };

    const filteredProducts = products.filter(p => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) ||
            p.variants.some(v => v.sku.toLowerCase().includes(q));
        const avail = (p.stock_quantity ?? 0) - (p.reserved_quantity ?? 0);
        const rp = p.reorder_point ?? 5;
        const matchStock = stockFilter === 'all' ? true :
            stockFilter === 'out' ? avail <= 0 :
            stockFilter === 'low' ? (avail > 0 && avail <= rp) : true;
        return matchSearch && matchStock;
    });

    const outOfStock = products.filter(p => ((p.stock_quantity ?? 0) - (p.reserved_quantity ?? 0)) <= 0).length;
    const lowStock = products.filter(p => { 
        const a = (p.stock_quantity ?? 0) - (p.reserved_quantity ?? 0); 
        const rp = p.reorder_point ?? 5;
        return a > 0 && a <= rp; 
    }).length;
    const totalVariants = products.reduce((s, p) => s + (p.variants?.length || 0), 0);

    const avail = (s: number, r: number) => s - r;
    const stockColor = (a: number, rp: number = 5, ss: number = 0) => a <= ss ? 'text-red-500' : a <= rp ? 'text-amber-500' : 'text-emerald-600';
    const stockBg = (a: number, rp: number = 5, ss: number = 0) => a <= ss ? 'bg-red-50 border-red-200' : a <= rp ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';

    return (
        <div className="max-w-7xl pb-20">
            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Stock Management</h1>
                    <p className="text-sm text-gray-400">View and manage inventory by product and variant</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => exportStockCsv(filteredProducts)}
                        disabled={loading || filteredProducts.length === 0}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-40"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                    <button onClick={loadProducts} disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 rounded text-sm disabled:opacity-50">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-5">
                <Link href="/admin/stock/bulk-entry"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    <Database size={15} /> Bulk Stock Entry
                </Link>
                <Link href="/admin/stock/record-sale"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Package size={15} /> Record External Sale
                </Link>
                <Link href="/admin/stock/receive"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors">
                    Receive Stock
                </Link>
                <Link href="/admin/stock/purchase-orders"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors">
                    Purchase Orders
                </Link>
                <Link href="/admin/stock/adjust"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors">
                    Adjust Stock
                </Link>
                <button
                    onClick={handleRepairOptions}
                    disabled={repairingOptions}
                    className="flex items-center gap-2 px-4 py-2 border border-amber-400 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 disabled:opacity-50 transition-colors"
                    title="Normalize variant option keys after Loyverse import (safe to re-run)"
                >
                    <RefreshCw size={15} className={repairingOptions ? 'animate-spin' : ''} /> {repairingOptions ? 'Repairing...' : 'Repair Options'}
                </button>
                <button
                    onClick={handleResetReserved}
                    disabled={resettingReserved}
                    className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                    title="Release reserved stock from abandoned checkouts"
                >
                    <AlertTriangle size={15} /> {resettingReserved ? 'Resetting...' : 'Reset Reserved'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <button onClick={() => setStockFilter('all')}
                    className={`bg-white border rounded-lg p-4 text-left transition-colors shadow-sm ${stockFilter === 'all' ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-2xl font-bold text-gray-900">{products.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Products</div>
                    <div className="text-xs text-gray-400">{totalVariants} variants</div>
                </button>
                <button onClick={() => setStockFilter('low')}
                    className={`bg-white border rounded-lg p-4 text-left transition-colors shadow-sm ${stockFilter === 'low' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-200 hover:border-amber-200'}`}>
                    <div className="text-2xl font-bold text-amber-500">{lowStock}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Low Stock</div>
                </button>
                <button onClick={() => setStockFilter('out')}
                    className={`bg-white border rounded-lg p-4 text-left transition-colors shadow-sm ${stockFilter === 'out' ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-200 hover:border-red-200'}`}>
                    <div className="text-2xl font-bold text-red-500">{outOfStock}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Out of Stock</div>
                </button>
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                    <button onClick={handleInitialize} disabled={initializing}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 disabled:opacity-50">
                        {initializing ? <RefreshCw size={13} className="animate-spin" /> : <Database size={13} />}
                        Init Stock Fields
                    </button>
                    <p className="text-[10px] text-gray-400 text-center mt-1">Firebase = source of truth</p>
                </div>
            </div>

            {/* Result banner */}
            {result && (
                <div className={`border rounded-lg p-3 mb-4 flex items-center gap-2 text-sm ${result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                    {result.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    {result.message || result.error || JSON.stringify(result)}
                </div>
            )}

            {/* Search */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 shadow-sm flex items-center gap-2">
                <Search size={15} className="text-gray-400 shrink-0" />
                <input type="text" placeholder="Search by product name, SKU, or variant SKU…"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 text-sm focus:outline-none text-gray-900 placeholder-gray-400" />
            </div>

            {/* Mobile card view */}
            {isMobile ? (
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">No products found</div>
                    ) : filteredProducts.map(product => {
                        const hasVariants = product.variants?.length > 0;
                        const isExpanded = expandedProducts.has(product.id);
                        const a = avail(product.stock_quantity, product.reserved_quantity);
                        const rp = product.reorder_point ?? 5;
                        const ss = product.safety_stock ?? 0;
                        return (
                            <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <button onClick={() => hasVariants && toggleExpand(product.id)} className="w-full p-4 text-left">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {a <= ss && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                                                {a > ss && a <= rp && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                                                <span className="font-medium text-gray-900 truncate">{product.name}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono mt-0.5">{product.sku}</div>
                                        </div>
                                        <div className="text-right ml-2 shrink-0">
                                            <div className={`text-xl font-bold font-mono ${stockColor(a, rp, ss)}`}>{a}</div>
                                            <div className="text-xs text-gray-400">available</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                                        <span>Stock: {product.stock_quantity} · Reserved: {product.reserved_quantity} · <span className="text-gray-500">Reorder: {rp}</span></span>
                                        {hasVariants && (
                                            <span className="flex items-center gap-1">
                                                {product.variants.length} variants
                                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                {isExpanded && hasVariants && (
                                    <div className="border-t border-gray-100">
                                        {product.variants.map((v, i) => {
                                            const va = (v.stock_quantity ?? 0) - (v.reserved_quantity ?? 0);
                                            return (
                                                <div key={v.sku} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-50 last:border-0">
                                                    <div>
                                                        <div className="text-sm text-gray-700">{Object.values(v.options || {}).join(' / ') || `Variant ${i + 1}`}</div>
                                                        <div className="text-xs text-blue-500 font-mono">{v.sku}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-bold font-mono text-sm ${stockColor(va, rp, ss)}`}>{va}</div>
                                                        <div className="text-xs text-gray-400">{v.stock_quantity}/{v.reserved_quantity}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Desktop table */
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="w-10 px-4 py-3" />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product / Variant</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Stock</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Reserved</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Available</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Reorder At</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Edit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Loading inventory…</td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No products found</td></tr>
                            ) : filteredProducts.map(product => {
                                const hasVariants = product.variants?.length > 0;
                                const isExpanded = expandedProducts.has(product.id);
                                const a = avail(product.stock_quantity, product.reserved_quantity);
                                const rp = product.reorder_point ?? 5;
                                const ss = product.safety_stock ?? 0;
                                return (
                                    <React.Fragment key={product.id}>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                {hasVariants ? (
                                                    <button onClick={() => toggleExpand(product.id)}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors">
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                ) : (
                                                    <Package size={16} className="text-gray-300" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {a <= ss && <AlertTriangle size={13} className="text-red-500" />}
                                                    {a > ss && a <= rp && <AlertTriangle size={13} className="text-amber-500" />}
                                                    <span className="font-medium text-gray-900">{product.name}</span>
                                                    {hasVariants && (
                                                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                                            {product.variants.length} var
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-400 text-xs">{product.sku}</td>
                                            <td className="px-4 py-3 text-center text-gray-900 font-mono">{product.stock_quantity}</td>
                                            <td className="px-4 py-3 text-center text-amber-500 font-mono">{product.reserved_quantity}</td>
                                            <td className={`px-4 py-3 text-center font-mono font-bold ${stockColor(a, rp, ss)}`}>{a}</td>
                                            <td className="px-4 py-3 text-center text-gray-400 font-mono text-xs">{rp}</td>
                                            <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs">RM {product.price.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Link href={`/admin/products/${product.id}`}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors">
                                                    <Edit2 size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                        {isExpanded && hasVariants && product.variants.map((v, i) => {
                                            const va = (v.stock_quantity ?? 0) - (v.reserved_quantity ?? 0);
                                            return (
                                                <tr key={v.sku} className="bg-gray-50/60">
                                                    <td className="px-4 py-2" />
                                                    <td className="px-4 py-2 pl-12">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-300 text-xs">└─</span>
                                                            <span className="text-gray-600 text-sm">
                                                                {Object.values(v.options || {}).join(' / ') || `Variant ${i + 1}`}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-blue-500 text-xs">{v.sku}</td>
                                                    <td className="px-4 py-2 text-center text-gray-600 font-mono text-xs">{v.stock_quantity ?? 0}</td>
                                                    <td className="px-4 py-2 text-center text-amber-400 font-mono text-xs">{v.reserved_quantity ?? 0}</td>
                                                    <td className={`px-4 py-2 text-center font-mono font-bold text-sm ${stockColor(va, rp, ss)}`}>{va}</td>
                                                    <td className="px-4 py-2 text-center text-gray-300 font-mono text-xs">{rp}</td>
                                                    <td className="px-4 py-2 text-right text-gray-400 font-mono text-xs">RM {(v.price || product.price).toFixed(2)}</td>
                                                    <td className="px-4 py-2" />
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Quick links */}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link href="/admin/stock/purchase-orders/new" className="text-emerald-700 font-semibold hover:underline">📋 New Purchase Order</Link>
                <Link href="/admin/stock/purchase-orders" className="text-emerald-600 hover:underline">📦 All POs</Link>
                <Link href="/admin/stock/receive" className="text-emerald-600 hover:underline">📥 Receive Stock</Link>
                <Link href="/admin/stock/damage" className="text-red-500 hover:underline">⚠️ Record Damage</Link>
                <Link href="/admin/stock/adjust" className="text-blue-600 hover:underline">+ Adjust</Link>
                <Link href="/admin/stock/transfer" className="text-blue-600 hover:underline">↔ Transfer</Link>
                <Link href="/admin/stock/pos-sale" className="text-orange-500 hover:underline">🏪 POS Sale</Link>
                <Link href="/admin/stock/audit" className="text-gray-500 hover:underline">✓ Audit</Link>
            </div>
        </div>
    );
}
