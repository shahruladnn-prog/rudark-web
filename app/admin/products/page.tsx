'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Search, Plus, RefreshCw, Package } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';

interface Product {
    id: string;
    name: string;
    sku: string;
    category_slug?: string;
    subcategory_slug?: string;
    web_price?: number;
    promo_price?: number;
    stock_quantity?: number;
    stock_status?: string;
    images?: string[];
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    // Get unique categories for filter dropdown
    const categories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => {
            if (p.category_slug) cats.add(p.category_slug);
        });
        return Array.from(cats).sort();
    }, [products]);

    // Filter products based on search and filters
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            // Search filter
            const query = searchQuery.toLowerCase();
            const matchesSearch = !query ||
                product.name?.toLowerCase().includes(query) ||
                product.sku?.toLowerCase().includes(query);

            // Category filter
            const matchesCategory = categoryFilter === 'all' ||
                product.category_slug === categoryFilter;

            // Status filter
            const matchesStatus = statusFilter === 'all' ||
                product.stock_status === statusFilter;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [products, searchQuery, categoryFilter, statusFilter]);

    const handleSearch = () => {
        // Already reactive via useMemo
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Product <span className="text-rudark-volt">Master</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Manage inventory, pricing, and content.
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={loadProducts}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-rudark-grey text-gray-300 hover:border-rudark-volt hover:text-rudark-volt transition-colors rounded-sm disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <Link href="/admin/products/new" className="flex items-center gap-2 bg-rudark-volt text-black px-6 py-2 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors">
                        <Plus size={18} />
                        New Product
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-rudark-carbon p-4 border border-rudark-grey rounded-sm mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Search */}
                    <div className="flex-1 min-w-[250px]">
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Search</label>
                        <div className="flex">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="SKU or product name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-rudark-matte text-white pl-10 pr-4 py-2 text-sm border border-rudark-grey rounded-sm focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Category</label>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-rudark-matte text-white px-4 py-2 text-sm border border-rudark-grey rounded-sm focus:border-rudark-volt focus:outline-none font-mono min-w-[150px]"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat.replace(/-/g, ' ').toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Stock Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-rudark-matte text-white px-4 py-2 text-sm border border-rudark-grey rounded-sm focus:border-rudark-volt focus:outline-none font-mono min-w-[150px]"
                        >
                            <option value="all">All Status</option>
                            <option value="IN_STOCK">In Stock</option>
                            <option value="LOW">Low Stock</option>
                            <option value="OUT_OF_STOCK">Out of Stock</option>
                        </select>
                    </div>

                    {/* Results count */}
                    <div className="text-gray-500 text-sm">
                        Showing {filteredProducts.length} of {products.length}
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-rudark-matte border-b border-rudark-grey">
                        <tr>
                            <th className="p-4 text-xs font-mono text-rudark-volt uppercase w-20">Image</th>
                            <th className="p-4 text-xs font-mono text-rudark-volt uppercase">Product Info</th>
                            <th className="p-4 text-xs font-mono text-rudark-volt uppercase">Category</th>
                            <th className="p-4 text-xs font-mono text-rudark-volt uppercase">Price</th>
                            <th className="p-4 text-xs font-mono text-rudark-volt uppercase">Stock</th>
                            <th className="p-4 text-xs font-mono text-rudark-volt uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-500">
                                    Loading products...
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-500">
                                    {products.length === 0
                                        ? 'No products found. Sync from Loyverse first.'
                                        : 'No products match your filters.'}
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id} className="border-b border-rudark-grey/30 hover:bg-rudark-matte/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="w-14 h-14 bg-rudark-matte rounded-sm border border-rudark-grey/50 overflow-hidden">
                                            {product.images && product.images[0] ? (
                                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Package size={20} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white uppercase font-condensed">{product.name}</div>
                                        <div className="text-rudark-volt font-mono text-xs">{product.sku}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-block px-2 py-1 bg-rudark-grey/30 text-gray-300 text-xs font-mono uppercase rounded-sm border border-rudark-grey/50">
                                            {product.category_slug || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-sm">
                                        {product.promo_price ? (
                                            <div className="flex flex-col">
                                                <span className="text-rudark-volt font-bold">RM {product.promo_price.toFixed(2)}</span>
                                                <span className="text-gray-500 line-through text-xs">RM {product.web_price?.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-white">RM {product.web_price?.toFixed(2) || '0.00'}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-bold uppercase border ${product.stock_status === 'IN_STOCK' ? 'bg-green-900/20 text-green-400 border-green-900/50' :
                                                    product.stock_status === 'LOW' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' :
                                                        'bg-red-900/20 text-red-400 border-red-900/50'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${product.stock_status === 'IN_STOCK' ? 'bg-green-400' :
                                                        product.stock_status === 'LOW' ? 'bg-yellow-400' :
                                                            'bg-red-400'
                                                    }`} />
                                                {product.stock_status?.replace('_', ' ') || 'UNKNOWN'}
                                            </span>
                                            <span className="text-gray-500 text-xs mt-1">
                                                Qty: {product.stock_quantity ?? 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/admin/products/${product.id}`}
                                                className="p-2 text-gray-400 hover:text-rudark-volt hover:bg-white/5 rounded-sm transition-colors"
                                            >
                                                <Edit size={18} />
                                            </Link>
                                            <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-900/10 rounded-sm transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Stats */}
            <div className="mt-4 text-right text-gray-500 text-sm">
                {filteredProducts.length} products displayed
            </div>
        </div>
    );
}
