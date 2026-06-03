'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trash2, AlertTriangle, Search, CheckSquare, Square, Edit2, Check, X } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import { deleteProduct } from '@/actions/product-actions';
import { useToast } from '@/components/ui/toast';

type ProductRow = {
    id: string;
    sku: string;
    name: string;
    category_slug: string;
    web_price: number;
    images: string[];
    variants: any[];
    created_at: any;
};

export default function ProductCleanupPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'duplicates' | 'orphans'>('all');
    const [editingSku, setEditingSku] = useState<string | null>(null);
    const [editSkuValue, setEditSkuValue] = useState('');
    const [deleting, setDeleting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getProducts();
            setProducts(data as unknown as ProductRow[]);
        } catch (e) {
            showToast('error', 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const skuGroups = useMemo(() => {
        const groups: Record<string, ProductRow[]> = {};
        products.forEach(p => {
            const key = p.sku?.toLowerCase().trim() || 'no-sku';
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return groups;
    }, [products]);

    const duplicateIds = useMemo(() => {
        const ids = new Set<string>();
        Object.values(skuGroups).forEach(group => {
            if (group.length > 1) group.forEach(p => ids.add(p.id));
        });
        return ids;
    }, [skuGroups]);

    const orphanIds = useMemo(() => {
        return new Set(
            products
                .filter(p => !p.web_price || p.web_price === 0 || !p.images?.length || !p.category_slug || p.category_slug === 'uncategorized')
                .map(p => p.id)
        );
    }, [products]);

    const filtered = useMemo(() => {
        let list = products;
        if (filter === 'duplicates') list = list.filter(p => duplicateIds.has(p.id));
        if (filter === 'orphans') list = list.filter(p => orphanIds.has(p.id));
        if (search.trim()) {
            const s = search.toLowerCase();
            list = list.filter(p => p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
        }
        return list;
    }, [products, filter, search, duplicateIds, orphanIds]);

    const toggleSelect = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(p => p.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`Delete ${selected.size} product(s)? This cannot be undone.`)) return;
        setDeleting(true);
        let success = 0;
        for (const id of selected) {
            try {
                await deleteProduct(id);
                success++;
            } catch {}
        }
        showToast(success === selected.size ? 'success' : 'warning', `Deleted ${success} of ${selected.size} products`);
        setSelected(new Set());
        await load();
        setDeleting(false);
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Product Cleanup</h1>
                    <p className="text-gray-500 text-sm">{products.length} products · {duplicateIds.size} duplicates · {orphanIds.size} orphans</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'duplicates', 'orphans'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        >
                            {f} {f === 'duplicates' ? `(${duplicateIds.size})` : f === 'orphans' ? `(${orphanIds.size})` : `(${products.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Actions */}
            {selected.size > 0 && (
                <div className="flex items-center gap-4 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <span className="text-sm font-medium text-red-700">{selected.size} selected</span>
                    <button
                        onClick={handleBulkDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                        <Trash2 size={14} />
                        {deleting ? 'Deleting...' : 'Delete Selected'}
                    </button>
                    <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
                        Clear selection
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading products...</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="w-10 p-3 text-left">
                                    <button onClick={toggleAll}>
                                        {selected.size === filtered.length && filtered.length > 0
                                            ? <CheckSquare size={16} className="text-blue-600" />
                                            : <Square size={16} className="text-gray-400" />}
                                    </button>
                                </th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Price</th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Images</th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Issues</th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(p => {
                                const isDuplicate = duplicateIds.has(p.id);
                                const isOrphan = orphanIds.has(p.id);
                                const issues = [];
                                if (isDuplicate) issues.push('Duplicate SKU');
                                if (!p.web_price || p.web_price === 0) issues.push('No price');
                                if (!p.images?.length) issues.push('No image');
                                if (!p.category_slug || p.category_slug === 'uncategorized') issues.push('No category');

                                return (
                                    <tr key={p.id} className={`hover:bg-gray-50 ${isDuplicate ? 'bg-yellow-50/50' : ''}`}>
                                        <td className="p-3">
                                            <button onClick={() => toggleSelect(p.id)}>
                                                {selected.has(p.id)
                                                    ? <CheckSquare size={16} className="text-blue-600" />
                                                    : <Square size={16} className="text-gray-400" />}
                                            </button>
                                        </td>
                                        <td className="p-3">
                                            {editingSku === p.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        value={editSkuValue}
                                                        onChange={e => setEditSkuValue(e.target.value)}
                                                        className="border border-blue-400 rounded px-2 py-0.5 text-xs w-28 focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => { showToast('info', 'SKU editing requires saving from the product editor.'); setEditingSku(null); }}>
                                                        <Check size={14} className="text-green-600" />
                                                    </button>
                                                    <button onClick={() => setEditingSku(null)}>
                                                        <X size={14} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 group">
                                                    <span className="font-mono text-xs text-gray-700">{p.sku || '—'}</span>
                                                    <button onClick={() => { setEditingSku(p.id); setEditSkuValue(p.sku); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Edit2 size={11} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 font-medium text-gray-900 max-w-[200px] truncate">{p.name}</td>
                                        <td className="p-3 text-gray-500 hidden md:table-cell">{p.category_slug || '—'}</td>
                                        <td className="p-3 text-gray-700 hidden md:table-cell">{p.web_price ? `RM ${p.web_price.toFixed(2)}` : <span className="text-red-400">No price</span>}</td>
                                        <td className="p-3 text-gray-500 hidden lg:table-cell">{p.images?.length || 0}</td>
                                        <td className="p-3">
                                            <div className="flex flex-wrap gap-1">
                                                {issues.map(issue => (
                                                    <span key={issue} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">
                                                        <AlertTriangle size={9} />
                                                        {issue}
                                                    </span>
                                                ))}
                                                {issues.length === 0 && <span className="text-green-500 text-xs">✓ OK</span>}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => router.push(`/admin/products/${p.id}`)}
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`Delete "${p.name}"?`)) return;
                                                        try {
                                                            await deleteProduct(p.id);
                                                            showToast('success', 'Product deleted');
                                                            await load();
                                                        } catch (e: any) {
                                                            showToast('error', e.message || 'Delete failed');
                                                        }
                                                    }}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            {search ? 'No products match your search.' : filter !== 'all' ? `No ${filter} found.` : 'No products found.'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
