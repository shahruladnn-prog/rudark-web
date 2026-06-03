'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
    Edit, Trash2, Search, Plus, RefreshCw, 
    Eye, EyeOff, Home, ExternalLink, Tag
} from 'lucide-react';
import { getProducts, deleteProduct, toggleProductVisibility } from '@/actions/product-actions';
import { useToast } from '@/components/ui/toast';

export default function AdminProductsPage() {
    const { showToast } = useToast();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data);
        } catch {
            showToast('error', 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProducts(); }, []);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => { if (p.category_slug) cats.add(p.category_slug); });
        return Array.from(cats).sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
            const matchesCategory = categoryFilter === 'all' || p.category_slug === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, categoryFilter]);

    const handleToggleVisibility = async (id: string, field: 'is_public' | 'is_home_public', current: boolean) => {
        const res = await toggleProductVisibility(id, field, current);
        if (res.success) {
            setProducts(products.map(p => p.id === id ? { ...p, [field]: !current } : p));
            showToast('success', 'Visibility updated');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        const res = await deleteProduct(id);
        if (res.success) {
            showToast('success', 'Product deleted');
            loadProducts();
        } else {
            showToast('error', res.error || 'Failed to delete');
        }
    };

    return (
        <div className="max-w-[1800px] mx-auto pb-20">
            {/* Industrial Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-8 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Product Catalog</h1>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Master Listing — {filteredProducts.length} Items</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadProducts} disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all rounded-sm text-xs font-bold uppercase">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <Link href="/admin/products/cleanup"
                        className="flex items-center gap-2 border-2 border-orange-400 text-orange-600 px-4 py-2 rounded-sm text-xs font-black uppercase hover:bg-orange-400 hover:text-white transition-all">
                        <Tag size={14} /> Cleanup
                    </Link>
                    <Link href="/admin/products/sync"
                        className="flex items-center gap-2 border-2 border-emerald-500 text-emerald-600 px-4 py-2 rounded-sm text-xs font-black uppercase hover:bg-emerald-500 hover:text-white transition-all">
                        <RefreshCw size={14} /> Import Loyverse
                    </Link>
                    <Link href="/admin/products/new"
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-sm text-xs font-black uppercase hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
                        <Plus size={14} /> New Product
                    </Link>
                </div>
            </div>

            {/* High Density Filters */}
            <div className="flex flex-wrap gap-4 items-center mb-6 bg-white p-3 border border-gray-100 rounded-sm shadow-sm">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input type="text" placeholder="QUICK SEARCH (SKU, NAME)..." value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border-none focus:ring-2 focus:ring-blue-500/10 text-gray-900 font-bold uppercase placeholder-gray-300 transition-all" />
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-sm border border-gray-100">
                    <Tag size={14} className="text-gray-400" />
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold text-gray-700 uppercase focus:outline-none min-w-[150px]">
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c.replace(/-/g, ' ')}</option>)}
                    </select>
                </div>
                {categoryFilter !== 'all' && (
                    <button onClick={() => setCategoryFilter('all')} className="text-[10px] font-black text-blue-600 uppercase hover:underline">Clear Filter</button>
                )}
            </div>

            {/* Industrial Table */}
            <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-200">
                            <th className="px-6 py-4">Product Detail</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Price (MYR)</th>
                            <th className="px-6 py-4 text-center">Online Store</th>
                            <th className="px-6 py-4 text-center">Home Page</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-300 font-bold uppercase tracking-widest animate-pulse">Fetching Catalog...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-300 font-bold uppercase tracking-widest">No matching products found</td></tr>
                        ) : filteredProducts.map(p => (
                            <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900 text-sm uppercase truncate max-w-md group-hover:text-blue-600 transition-colors">{p.name}</div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                                        <span className="bg-gray-100 px-1 rounded text-gray-500 font-black tracking-tighter">SKU</span>
                                        {p.sku}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => setCategoryFilter(p.category_slug || 'all')}
                                        className="text-[10px] font-black text-gray-500 uppercase px-2 py-1 bg-gray-100 hover:bg-blue-600 hover:text-white transition-all rounded-sm"
                                    >
                                        {p.category_slug?.replace(/-/g, ' ') || 'Uncategorised'}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    {p.promo_price ? (
                                        <div className="flex flex-col">
                                            <span className="text-blue-600 font-black text-sm font-mono">RM{p.promo_price.toFixed(2)}</span>
                                            <span className="text-[10px] text-gray-400 line-through font-mono">RM{p.web_price?.toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-900 font-black text-sm font-mono">RM{p.web_price?.toFixed(2) || '0.00'}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleToggleVisibility(p.id, 'is_public', p.is_public)}
                                        className={`p-2 rounded-sm transition-all ${p.is_public ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-300 hover:text-gray-400'}`}
                                        title={p.is_public ? "Hide from Store" : "Show in Store"}
                                    >
                                        {p.is_public ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleToggleVisibility(p.id, 'is_home_public', p.is_home_public)}
                                        className={`p-2 rounded-sm transition-all ${p.is_home_public ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-300 hover:text-gray-400'}`}
                                        title={p.is_home_public ? "Remove from Homepage" : "Show on Homepage"}
                                    >
                                        <Home size={18} className={p.is_home_public ? 'fill-amber-500' : ''} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                                        <Link href={`/product/${p.sku}`} target="_blank"
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                            <ExternalLink size={16} />
                                        </Link>
                                        <Link href={`/admin/products/${p.id}`}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                                            <Edit size={16} />
                                        </Link>
                                        <button onClick={() => handleDelete(p.id, p.name)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End of Catalog</span>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {filteredProducts.length} of {products.length} Products Found
                </p>
            </div>
        </div>
    );
}
