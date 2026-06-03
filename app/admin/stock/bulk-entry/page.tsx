'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { getProductsForAdjustment } from '@/actions/stock-movement-actions';
import { recordBulkStockMovements } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

type ProductRow = {
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
    variants: { sku: string; options: Record<string, string>; stock_quantity: number; label: string }[];
};

type EntryRow = {
    productId: string;
    productName: string;
    variantSku?: string;
    variantLabel?: string;
    currentStock: number;
    newStock: string; // string for controlled input
};

export default function BulkStockEntryPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [entries, setEntries] = useState<Record<string, string>>({}); // key: "productId:variantSku" or "productId", value: new stock input

    useEffect(() => {
        getProductsForAdjustment().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    const filteredProducts = products.filter(p => {
        if (!search.trim()) return true;
        const s = search.toLowerCase();
        return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
    });

    const getKey = (productId: string, variantSku?: string) =>
        variantSku ? `${productId}:${variantSku}` : productId;

    const setEntry = (productId: string, variantSku: string | undefined, value: string) => {
        setEntries(prev => ({ ...prev, [getKey(productId, variantSku)]: value }));
    };

    const getEntry = (productId: string, variantSku?: string): string =>
        entries[getKey(productId, variantSku)] ?? '';

    const changedCount = Object.values(entries).filter(v => v !== '').length;

    const handleSave = async () => {
        const rows: EntryRow[] = [];

        for (const p of products) {
            if (p.variants.length > 0) {
                for (const v of p.variants) {
                    const val = getEntry(p.id, v.sku);
                    if (val === '') continue;
                    rows.push({
                        productId: p.id,
                        productName: p.name,
                        variantSku: v.sku,
                        variantLabel: v.label,
                        currentStock: v.stock_quantity,
                        newStock: val
                    });
                }
            } else {
                const val = getEntry(p.id);
                if (val === '') continue;
                rows.push({
                    productId: p.id,
                    productName: p.name,
                    currentStock: p.stock_quantity,
                    newStock: val
                });
            }
        }

        if (rows.length === 0) {
            showToast('warning', 'No changes to save');
            return;
        }

        if (!confirm(`Save stock counts for ${rows.length} item(s)? This will overwrite existing stock.`)) return;

        setSaving(true);
        try {
            const result = await recordBulkStockMovements(
                rows.map(r => ({
                    product_id: r.productId,
                    product_name: r.productName,
                    variant_sku: r.variantSku,
                    variant_label: r.variantLabel,
                    qty: parseInt(r.newStock) || 0,
                    current_stock: r.currentStock,
                    mode: 'set' as const,
                    type: 'ADJUST' as const
                })),
                undefined,
                'Initial stock count'
            );

            if (result.errors.length > 0) {
                showToast('warning', `Saved ${result.processed} rows. ${result.errors.length} errors.`);
            } else {
                showToast('success', `Saved stock for ${result.processed} items`);
                setEntries({});
                // Reload to show updated stock
                const updated = await getProductsForAdjustment();
                setProducts(updated);
            }
        } catch (e: any) {
            showToast('error', e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, productId: string, variantSku?: string, nextProductId?: string, nextVariantSku?: string) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (nextProductId) {
                const nextKey = getKey(nextProductId, nextVariantSku);
                const nextInput = document.querySelector<HTMLInputElement>(`input[data-key="${nextKey}"]`);
                nextInput?.focus();
                nextInput?.select();
            }
        }
    };

    // Build a flat list of focusable rows for keyboard navigation
    const flatRows: { productId: string; variantSku: string | undefined }[] = [];
    filteredProducts.forEach(p => {
        if (p.variants.length > 0 && expanded.has(p.id)) {
            p.variants.forEach(v => flatRows.push({ productId: p.id, variantSku: v.sku }));
        } else if (p.variants.length === 0) {
            flatRows.push({ productId: p.id, variantSku: undefined });
        }
    });

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Bulk Stock Entry</h1>
                        <p className="text-gray-500 text-sm">Enter your physical count for all SKUs at once. Press Enter to jump to next row.</p>
                    </div>
                </div>
                {changedCount > 0 && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : `Save ${changedCount} Change${changedCount !== 1 ? 's' : ''}`}
                    </button>
                )}
            </div>

            {/* Info banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
                <strong>How to use:</strong> Enter the actual quantity you counted for each item. Leave blank to keep current stock. Click the arrow to expand variant rows. Press Enter to move to the next row.
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading products...</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-8"></th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product / Variant</th>
                                <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">SKU</th>
                                <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-28">Current</th>
                                <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">New Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProducts.map((p, pi) => {
                                const hasVariants = p.variants.length > 0;
                                const isExpanded = expanded.has(p.id);
                                const parentEntry = getEntry(p.id);

                                return (
                                    <>
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                {hasVariants ? (
                                                    <button
                                                        onClick={() => {
                                                            const next = new Set(expanded);
                                                            if (isExpanded) next.delete(p.id); else next.add(p.id);
                                                            setExpanded(next);
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                    </button>
                                                ) : null}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium text-gray-900">{p.name}</div>
                                                {hasVariants && (
                                                    <div className="text-xs text-gray-400">{p.variants.length} variants — click arrow to expand</div>
                                                )}
                                            </td>
                                            <td className="p-3 font-mono text-xs text-gray-500 hidden sm:table-cell">{p.sku}</td>
                                            <td className="p-3 text-right">
                                                <span className={`font-mono text-sm font-bold ${p.stock_quantity === 0 ? 'text-red-500' : p.stock_quantity <= 5 ? 'text-yellow-600' : 'text-gray-700'}`}>
                                                    {p.stock_quantity}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                {!hasVariants && (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        data-key={getKey(p.id)}
                                                        value={parentEntry}
                                                        onChange={e => setEntry(p.id, undefined, e.target.value)}
                                                        onKeyDown={e => {
                                                            const myIdx = flatRows.findIndex(r => r.productId === p.id && !r.variantSku);
                                                            const next = flatRows[myIdx + 1];
                                                            handleKeyDown(e, p.id, undefined, next?.productId, next?.variantSku);
                                                        }}
                                                        placeholder="—"
                                                        className={`w-24 text-right border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500
                                                            ${parentEntry !== '' ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                        {hasVariants && isExpanded && p.variants.map((v, vi) => {
                                            const variantEntry = getEntry(p.id, v.sku);
                                            return (
                                                <tr key={v.sku} className="bg-gray-50/50 hover:bg-gray-100/50">
                                                    <td className="p-3"></td>
                                                    <td className="p-3 pl-8">
                                                        <span className="text-gray-600 text-sm">{v.label}</span>
                                                    </td>
                                                    <td className="p-3 font-mono text-xs text-gray-400 hidden sm:table-cell">{v.sku}</td>
                                                    <td className="p-3 text-right">
                                                        <span className={`font-mono text-sm font-bold ${v.stock_quantity === 0 ? 'text-red-500' : v.stock_quantity <= 5 ? 'text-yellow-600' : 'text-gray-700'}`}>
                                                            {v.stock_quantity}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            data-key={getKey(p.id, v.sku)}
                                                            value={variantEntry}
                                                            onChange={e => setEntry(p.id, v.sku, e.target.value)}
                                                            onKeyDown={e => {
                                                                const myIdx = flatRows.findIndex(r => r.productId === p.id && r.variantSku === v.sku);
                                                                const next = flatRows[myIdx + 1];
                                                                handleKeyDown(e, p.id, v.sku, next?.productId, next?.variantSku);
                                                            }}
                                                            placeholder="—"
                                                            className={`w-24 text-right border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500
                                                                ${variantEntry !== '' ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredProducts.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            {search ? 'No products match your search.' : 'No products found.'}
                        </div>
                    )}
                </div>
            )}

            {changedCount > 0 && (
                <div className="fixed bottom-6 right-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-all"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : `Save ${changedCount} Change${changedCount !== 1 ? 's' : ''}`}
                    </button>
                </div>
            )}
        </div>
    );
}
