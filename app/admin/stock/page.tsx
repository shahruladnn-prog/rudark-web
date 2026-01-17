'use client';

import React, { useState, useEffect } from 'react';
import { initializeStockFields } from '@/actions/sync-stock';
import { cleanupExpiredReservations } from '@/actions/stock-cleanup';
// Note: syncStockFromLoyverse removed - Firebase is now sole source of truth
import { getProducts } from '@/actions/product-actions';
import { RefreshCw, Database, CheckCircle, AlertCircle, Search, Package, AlertTriangle, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
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
}

export default function StockManagementPage() {
    // Sync state removed - Firebase is sole source of truth
    const [initializing, setInitializing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [products, setProducts] = useState<ProductStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            const mapped = data.map((p: any) => ({
                id: p.id,
                name: p.name || 'Unnamed',
                sku: p.sku || '-',
                stock_quantity: p.stock_quantity ?? 0,
                reserved_quantity: p.reserved_quantity ?? 0,
                price: p.price || p.web_price || 0,
                category: p.category || p.category_slug || '-',
                variants: p.variants || []
            }));
            setProducts(mapped);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Cleanup expired reservations on page load
        cleanupExpiredReservations(30).then(result => {
            if (result.success && result.expired && result.expired > 0) {
                console.log(`[Stock Page] Cleaned up ${result.expired} expired reservations`);
            }
        }).catch(err => console.warn('[Stock Page] Cleanup check failed:', err));

        loadProducts();
    }, []);

    // handleSync removed - Firebase is sole source of truth
    // Loyverse sync is now one-way: Firebase -> Loyverse (receipts only)

    const handleInitialize = async () => {
        setInitializing(true);
        setResult(null);
        const res = await initializeStockFields();
        setResult(res);
        setInitializing(false);
        loadProducts();
    };

    const toggleExpand = (productId: string) => {
        const newExpanded = new Set(expandedProducts);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
        }
        setExpandedProducts(newExpanded);
    };

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.variants.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));

        const available = (p.stock_quantity ?? 0) - (p.reserved_quantity ?? 0);
        const matchesStock =
            stockFilter === 'all' ? true :
                stockFilter === 'out' ? available <= 0 :
                    stockFilter === 'low' ? (available > 0 && available <= 5) : true;

        return matchesSearch && matchesStock;
    });

    // Stats
    const outOfStock = products.filter(p => ((p.stock_quantity ?? 0) - (p.reserved_quantity ?? 0)) <= 0).length;
    const lowStock = products.filter(p => {
        const avail = (p.stock_quantity ?? 0) - (p.reserved_quantity ?? 0);
        return avail > 0 && avail <= 5;
    }).length;
    const totalProducts = products.length;
    const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);

    const getAvailable = (stock: number, reserved: number) => stock - reserved;

    const getStockColor = (available: number) => {
        if (available <= 0) return 'text-red-400';
        if (available <= 5) return 'text-yellow-400';
        return 'text-green-400';
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Stock <span className="text-rudark-volt">Management</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        View and manage inventory by product and variant
                    </p>
                </div>
                <button
                    onClick={loadProducts}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 border border-rudark-grey text-gray-300 hover:border-rudark-volt hover:text-rudark-volt transition-colors rounded-sm disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
                <button
                    onClick={() => setStockFilter('all')}
                    className={`bg-rudark-carbon p-4 border rounded-sm text-left transition-colors ${stockFilter === 'all' ? 'border-rudark-volt' : 'border-rudark-grey hover:border-gray-500'}`}
                >
                    <div className="text-xl md:text-3xl font-bold text-white">{totalProducts}</div>
                    <div className="text-xs text-gray-400 uppercase">Products</div>
                    <div className="text-xs text-gray-500 hidden md:block">{totalVariants} variants</div>
                </button>
                <button
                    onClick={() => setStockFilter('low')}
                    className={`bg-rudark-carbon p-4 border rounded-sm text-left transition-colors ${stockFilter === 'low' ? 'border-yellow-400' : 'border-yellow-500/30 hover:border-yellow-500'}`}
                >
                    <div className="text-xl md:text-3xl font-bold text-yellow-400">{lowStock}</div>
                    <div className="text-xs text-gray-400 uppercase">Low Stock (≤5)</div>
                </button>
                <button
                    onClick={() => setStockFilter('out')}
                    className={`bg-rudark-carbon p-4 border rounded-sm text-left transition-colors ${stockFilter === 'out' ? 'border-red-400' : 'border-red-500/30 hover:border-red-500'}`}
                >
                    <div className="text-xl md:text-3xl font-bold text-red-400">{outOfStock}</div>
                    <div className="text-xs text-gray-400 uppercase">Out of Stock</div>
                </button>
                <div className="bg-rudark-carbon p-3 md:p-4 border border-rudark-grey rounded-sm col-span-2 md:col-span-1">
                    <div className="flex gap-2">
                        <button
                            onClick={handleInitialize}
                            disabled={initializing}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-white rounded-sm text-xs font-bold uppercase hover:bg-gray-600 disabled:opacity-50"
                        >
                            {initializing ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                            Init Fields
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">Firebase = Source of Truth</div>
                </div>
            </div>

            {/* Result */}
            {result && (
                <div className={`border rounded-sm p-3 mb-4 ${result.success ? 'bg-green-900/20 border-green-900/50' : 'bg-red-900/20 border-red-900/50'}`}>
                    <div className="flex items-center gap-2 text-sm">
                        {result.success ? <CheckCircle size={16} className="text-green-400" /> : <AlertCircle size={16} className="text-red-400" />}
                        <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                            {result.success ? 'Success' : 'Error'}:
                        </span>
                        <span className="text-gray-300">{result.message || result.error || JSON.stringify(result)}</span>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-rudark-carbon p-4 border border-rudark-grey rounded-sm mb-4">
                <div className="flex items-center gap-2">
                    <Search size={18} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by product name, SKU, or variant SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Inventory - Mobile Cards or Desktop Table */}
            {isMobile ? (
                // Mobile Card View
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">No products found</div>
                    ) : (
                        filteredProducts.map((product) => {
                            const hasVariants = product.variants && product.variants.length > 0;
                            const isExpanded = expandedProducts.has(product.id);
                            const available = getAvailable(product.stock_quantity, product.reserved_quantity);

                            return (
                                <div key={product.id} className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                                    {/* Card Header */}
                                    <button
                                        onClick={() => hasVariants && toggleExpand(product.id)}
                                        className="w-full p-4 text-left"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {available <= 0 && <AlertTriangle size={14} className="text-red-400" />}
                                                    {available > 0 && available <= 5 && <AlertTriangle size={14} className="text-yellow-400" />}
                                                    <span className="font-bold text-white truncate">{product.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono">{product.sku}</div>
                                            </div>
                                            <div className="text-right ml-2">
                                                <div className={`text-lg font-bold font-mono ${getStockColor(available)}`}>{available}</div>
                                                <div className="text-xs text-gray-500">available</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex gap-3 text-gray-400">
                                                <span>Stock: {product.stock_quantity}</span>
                                                <span>Reserved: {product.reserved_quantity}</span>
                                            </div>
                                            {hasVariants && (
                                                <span className="text-gray-500 flex items-center gap-1">
                                                    {product.variants.length} variants
                                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded Variants */}
                                    {isExpanded && hasVariants && (
                                        <div className="border-t border-rudark-grey bg-rudark-matte/50">
                                            {product.variants.map((v, idx) => {
                                                const vStock = v.stock_quantity ?? 0;
                                                const vReserved = v.reserved_quantity ?? 0;
                                                const vAvail = vStock - vReserved;
                                                const label = Object.values(v.options || {}).join(' / ');
                                                return (
                                                    <div key={v.sku} className="flex justify-between items-center p-3 border-b border-rudark-grey/30 last:border-0">
                                                        <div>
                                                            <div className="text-gray-300 text-sm">{label || `Variant ${idx + 1}`}</div>
                                                            <div className="text-xs text-rudark-volt font-mono">{v.sku}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`font-bold font-mono ${getStockColor(vAvail)}`}>{vAvail}</div>
                                                            <div className="text-xs text-gray-500">{vStock}/{vReserved}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-rudark-matte border-b border-rudark-grey">
                                <tr>
                                    <th className="w-10 p-4"></th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Product / Variant</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">SKU</th>
                                    <th className="text-center p-4 text-xs font-mono text-rudark-volt uppercase">Stock</th>
                                    <th className="text-center p-4 text-xs font-mono text-rudark-volt uppercase">Reserved</th>
                                    <th className="text-center p-4 text-xs font-mono text-rudark-volt uppercase">Available</th>
                                    <th className="text-right p-4 text-xs font-mono text-rudark-volt uppercase">Price</th>
                                    <th className="text-center p-4 text-xs font-mono text-rudark-volt uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-400">
                                            Loading inventory...
                                        </td>
                                    </tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-gray-400">
                                            No products found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => {
                                        const hasVariants = product.variants && product.variants.length > 0;
                                        const isExpanded = expandedProducts.has(product.id);
                                        const available = getAvailable(product.stock_quantity, product.reserved_quantity);

                                        return (
                                            <React.Fragment key={product.id}>
                                                {/* Parent Product Row */}
                                                <tr className="border-b border-rudark-grey/30 hover:bg-rudark-matte/50 transition-colors">
                                                    <td className="p-4">
                                                        {hasVariants ? (
                                                            <button
                                                                onClick={() => toggleExpand(product.id)}
                                                                className="text-gray-400 hover:text-rudark-volt transition-colors"
                                                            >
                                                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                            </button>
                                                        ) : (
                                                            <Package size={18} className="text-gray-600" />
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            {available <= 0 && <AlertTriangle size={14} className="text-red-400" />}
                                                            {available > 0 && available <= 5 && <AlertTriangle size={14} className="text-yellow-400" />}
                                                            <span className="text-white font-medium">{product.name}</span>
                                                            {hasVariants && (
                                                                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                                                                    {product.variants.length} variants
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-mono text-gray-400 text-sm">{product.sku}</td>
                                                    <td className="p-4 text-center text-white font-mono">{product.stock_quantity}</td>
                                                    <td className="p-4 text-center text-yellow-400 font-mono">{product.reserved_quantity}</td>
                                                    <td className={`p-4 text-center font-mono font-bold ${getStockColor(available)}`}>
                                                        {available}
                                                    </td>
                                                    <td className="p-4 text-right text-rudark-volt font-mono">
                                                        RM {product.price.toFixed(2)}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Link
                                                            href={`/admin/products/${product.id}`}
                                                            className="text-gray-400 hover:text-rudark-volt transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </Link>
                                                    </td>
                                                </tr>

                                                {/* Variant Rows */}
                                                {isExpanded && hasVariants && product.variants.map((variant, idx) => {
                                                    const variantStock = variant.stock_quantity ?? 0;
                                                    const variantReserved = variant.reserved_quantity ?? 0;
                                                    const variantAvailable = getAvailable(variantStock, variantReserved);
                                                    const optionLabel = Object.entries(variant.options || {})
                                                        .map(([k, v]) => `${v}`)
                                                        .join(' / ');

                                                    return (
                                                        <tr
                                                            key={`${product.id}-${variant.sku}`}
                                                            className="bg-rudark-matte/30 border-b border-rudark-grey/20"
                                                        >
                                                            <td className="p-4"></td>
                                                            <td className="p-4 pl-12">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-gray-400">└─</span>
                                                                    <span className="text-gray-300">{optionLabel || `Variant ${idx + 1}`}</span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 font-mono text-rudark-volt text-sm">{variant.sku}</td>
                                                            <td className="p-4 text-center text-gray-300 font-mono">{variantStock}</td>
                                                            <td className="p-4 text-center text-yellow-400/70 font-mono">{variantReserved}</td>
                                                            <td className={`p-4 text-center font-mono font-bold ${getStockColor(variantAvailable)}`}>
                                                                {variantAvailable}
                                                            </td>
                                                            <td className="p-4 text-right text-gray-400 font-mono">
                                                                RM {(variant.price || product.price).toFixed(2)}
                                                            </td>
                                                            <td className="p-4"></td>
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Count */}
            <div className="mt-4 flex justify-between items-center text-gray-500 text-sm">
                <div>
                    Showing {filteredProducts.length} of {totalProducts} products
                </div>
                <div className="flex flex-wrap gap-4">
                    <Link
                        href="/admin/stock/receive"
                        className="text-green-400 hover:text-white transition-colors"
                    >
                        📥 Receive Stock
                    </Link>
                    <Link
                        href="/admin/stock/damage"
                        className="text-red-400 hover:text-white transition-colors"
                    >
                        ⚠️ Record Damage
                    </Link>
                    <Link
                        href="/admin/stock/adjust"
                        className="text-rudark-volt hover:text-white transition-colors"
                    >
                        + Adjust Stock
                    </Link>
                    <Link
                        href="/admin/stock/transfer"
                        className="text-rudark-volt hover:text-white transition-colors"
                    >
                        ↔ Transfer Stock
                    </Link>
                    <Link
                        href="/admin/stock/pos-sale"
                        className="text-orange-400 hover:text-white transition-colors"
                    >
                        🏪 POS Sale
                    </Link>
                    <Link
                        href="/admin/stock/archive"
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        📁 Archive
                    </Link>
                    <Link
                        href="/admin/stock/audit"
                        className="text-rudark-volt hover:text-white transition-colors"
                    >
                        ✓ Audit
                    </Link>
                </div>
            </div>
        </div>
    );
}
