'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { recordBulkStockMovements, getStockMovements, getProductsForAdjustment, StockMovement } from '@/actions/stock-movement-actions';
import { useToast } from '@/components/ui/toast';

type Mode = 'RECEIVE' | 'SET' | 'DAMAGE';

interface StockRow {
    productId: string;
    productName: string;
    productSku: string;
    variantSku?: string;
    variantLabel?: string;
    currentStock: number;
    inputQty: number;        // what the user typed
    isFirstVariant: boolean; // show product name grouping
    variantCount: number;    // total variants in this product group
}

const MODE_CONFIG = {
    RECEIVE:  { label: 'Receive Goods',   desc: 'Add units to stock (e.g. new purchase arrived)', color: 'emerald', inputLabel: 'Qty to Add', sign: +1 },
    SET:      { label: 'Stock Count',     desc: 'Set the exact stock level (physical count result)', color: 'blue', inputLabel: 'Set to', sign: 0 },
    DAMAGE:   { label: 'Write-off',       desc: 'Remove damaged or lost units from stock', color: 'red', inputLabel: 'Qty to Remove', sign: -1 },
};

export default function StockAdjustPage() {
    const { showToast } = useToast();
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [loadingMovements, setLoadingMovements] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [mode, setMode] = useState<Mode>('RECEIVE');
    const [search, setSearch] = useState('');
    const [reference, setReference] = useState('');
    const [reason, setReason] = useState('');
    const [qtys, setQtys] = useState<Record<string, number>>({}); // key: variantSku || productId
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [showOnlyChanged, setShowOnlyChanged] = useState(false);

    // Load products and movements independently so one failure doesn't block the other
    useEffect(() => {
        getProductsForAdjustment()
            .then(data => setAllProducts(data))
            .catch(() => showToast('error', 'Failed to load products'))
            .finally(() => setLoadingProducts(false));

        getStockMovements(30)
            .then(data => setMovements(data))
            .catch(() => {}) // movements failing is non-critical
            .finally(() => setLoadingMovements(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Flatten all products × variants into rows
    const allRows = useMemo<StockRow[]>(() => {
        const rows: StockRow[] = [];
        for (const p of allProducts) {
            if (p.variants && p.variants.length > 0) {
                p.variants.forEach((v: any, i: number) => {
                    rows.push({
                        productId: p.id,
                        productName: p.name,
                        productSku: p.sku,
                        variantSku: v.sku,
                        variantLabel: v.label || Object.values(v.options || {}).join(' / ') || v.sku,
                        currentStock: v.stock_quantity ?? 0,
                        inputQty: 0,
                        isFirstVariant: i === 0,
                        variantCount: p.variants.length,
                    });
                });
            } else {
                rows.push({
                    productId: p.id,
                    productName: p.name,
                    productSku: p.sku,
                    variantSku: undefined,
                    variantLabel: undefined,
                    currentStock: p.stock_quantity ?? 0,
                    inputQty: 0,
                    isFirstVariant: true,
                    variantCount: 0,
                });
            }
        }
        return rows;
    }, [allProducts]);

    // Filtered rows based on search + collapse state + showOnlyChanged
    const visibleRows = useMemo(() => {
        const q = search.toLowerCase().trim();
        return allRows.filter(row => {
            if (q && !row.productName.toLowerCase().includes(q) && !row.productSku.toLowerCase().includes(q) && !(row.variantLabel || '').toLowerCase().includes(q)) return false;
            if (collapsed[row.productId] && !row.isFirstVariant) return false;
            const key = row.variantSku || row.productId;
            if (showOnlyChanged && (qtys[key] ?? 0) === 0) return false;
            return true;
        });
    }, [allRows, search, collapsed, qtys, showOnlyChanged]);

    const rowKey = (row: StockRow) => row.variantSku || row.productId;

    const getInputQty = (row: StockRow) => qtys[rowKey(row)] ?? 0;

    const getNewTotal = (row: StockRow) => {
        const input = getInputQty(row);
        if (mode === 'SET') return input;
        if (mode === 'DAMAGE') return Math.max(0, row.currentStock - Math.abs(input));
        return row.currentStock + input;
    };

    const setQty = (row: StockRow, val: number) => {
        setQtys(prev => ({ ...prev, [rowKey(row)]: val }));
    };

    // Rows with actual changes
    const changedRows = allRows.filter(row => {
        const input = getInputQty(row);
        if (mode === 'SET') return input !== row.currentStock && input >= 0;
        return input !== 0;
    });

    const handleApply = async () => {
        if (changedRows.length === 0) { showToast('error', 'No changes to apply'); return; }
        setSubmitting(true);

        const bulkRows = changedRows.map(row => ({
            product_id: row.productId,
            product_name: row.productName,
            variant_sku: row.variantSku,
            variant_label: row.variantLabel,
            qty: mode === 'SET' ? getInputQty(row) : mode === 'DAMAGE' ? -Math.abs(getInputQty(row)) : getInputQty(row),
            current_stock: row.currentStock,
            mode: (mode === 'SET' ? 'set' : 'delta') as 'delta' | 'set',
            type: (mode === 'DAMAGE' ? 'DAMAGE' : mode === 'SET' ? 'ADJUST' : 'RECEIVE') as 'RECEIVE' | 'ADJUST' | 'DAMAGE',
        }));

        const res = await recordBulkStockMovements(bulkRows, reference || undefined, reason || undefined);

        if (res.success) {
            showToast('success', `✓ ${res.processed} item${res.processed !== 1 ? 's' : ''} updated`);
            setQtys({});
            setReference('');
            setReason('');
            setShowOnlyChanged(false);
            // Reload
            setLoadingProducts(true);
            getProductsForAdjustment().then(setAllProducts).finally(() => setLoadingProducts(false));
            getStockMovements(30).then(setMovements).catch(() => {});
        } else {
            showToast('error', `${res.processed} saved, ${res.errors.length} failed`);
            if (res.errors.length) console.error('Bulk errors:', res.errors);
        }
        setSubmitting(false);
    };

    const handleClearAll = () => { setQtys({}); setShowOnlyChanged(false); };

    const fmtDate = (d: any) => d ? new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';

    const modeConfig = MODE_CONFIG[mode];
    const colorMap = { emerald: 'bg-emerald-600', blue: 'bg-blue-600', red: 'bg-red-600' };
    const borderMap = { emerald: 'border-emerald-400', blue: 'border-blue-400', red: 'border-red-400' };

    return (
        <div className="max-w-6xl pb-20">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Stock Management</h1>
                    <p className="text-sm text-gray-400">Edit stock for multiple variants at once — no need to go one-by-one</p>
                </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG[Mode]][]).map(([key, cfg]) => (
                    <button
                        key={key}
                        onClick={() => { setMode(key); setQtys({}); }}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                            mode === key
                                ? `${borderMap[cfg.color as keyof typeof borderMap]} bg-white shadow-sm`
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                    >
                        <div className={`text-sm font-bold mb-1 ${mode === key ? `text-${cfg.color}-700` : 'text-gray-700'}`}>
                            {cfg.label}
                        </div>
                        <div className="text-xs text-gray-500">{cfg.desc}</div>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* LEFT: Spreadsheet */}
                <div className="xl:col-span-2 space-y-4">

                    {/* Controls bar */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search product or variant…"
                                className="w-full border border-gray-200 rounded pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                            />
                        </div>
                        <input
                            type="text"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            placeholder="Reference / PO No."
                            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 w-44"
                        />
                        <input
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 flex-1 min-w-[160px]"
                        />
                    </div>

                    {/* Filter toggle */}
                    {changedRows.length > 0 && (
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showOnlyChanged}
                                    onChange={e => setShowOnlyChanged(e.target.checked)}
                                    className="accent-blue-600"
                                />
                                Show only changed rows ({changedRows.length})
                            </label>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                        {loadingProducts ? (
                            <div className="text-center py-16 text-gray-400 text-sm">
                                <RefreshCw size={20} className="animate-spin mx-auto mb-3" />
                                Loading inventory…
                            </div>
                        ) : allRows.length === 0 ? (
                            <div className="text-center py-16 text-gray-400 text-sm">
                                No products found. Add products first.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="text-left px-4 py-3 w-1/2">Product / Variant</th>
                                            <th className="text-center px-3 py-3 w-24">Current</th>
                                            <th className="text-center px-3 py-3 w-32 text-blue-600">{modeConfig.inputLabel}</th>
                                            <th className="text-center px-3 py-3 w-24">New Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {visibleRows.map((row, i) => {
                                            const key = rowKey(row);
                                            const inputVal = getInputQty(row);
                                            const newTotal = getNewTotal(row);
                                            const delta = newTotal - row.currentStock;
                                            const hasChange = inputVal !== 0 || (mode === 'SET' && inputVal !== row.currentStock);
                                            const hasError = newTotal < 0;
                                            const isGroupHeader = row.isFirstVariant && row.variantCount > 1;
                                            const isCollapsed = collapsed[row.productId];

                                            return (
                                                <tr
                                                    key={`${row.productId}-${row.variantSku || 'base'}`}
                                                    className={`transition-colors ${
                                                        hasError ? 'bg-red-50' :
                                                        hasChange ? 'bg-blue-50/40' :
                                                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                                    }`}
                                                >
                                                    {/* Product/Variant name */}
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-start gap-2">
                                                            {/* Collapse toggle for multi-variant products */}
                                                            {isGroupHeader ? (
                                                                <button
                                                                    onClick={() => setCollapsed(prev => ({ ...prev, [row.productId]: !prev[row.productId] }))}
                                                                    className="mt-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
                                                                >
                                                                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                                                </button>
                                                            ) : (
                                                                <div className="w-4 flex-shrink-0" /> /* spacer */
                                                            )}
                                                            <div>
                                                                {row.isFirstVariant && (
                                                                    <div className="font-medium text-gray-900 leading-tight">
                                                                        {row.productName}
                                                                        {row.variantCount > 1 && (
                                                                            <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-normal">
                                                                                {row.variantCount} variants
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {row.variantLabel && (
                                                                    <div className={`text-xs mt-0.5 ${row.isFirstVariant ? 'text-gray-400' : 'text-gray-500 pl-0'}`}>
                                                                        {row.variantLabel}
                                                                        <span className="text-gray-300 ml-1.5">{row.variantSku}</span>
                                                                    </div>
                                                                )}
                                                                {!row.variantLabel && (
                                                                    <div className="text-xs text-gray-400 mt-0.5">{row.productSku}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Current stock */}
                                                    <td className="px-3 py-2 text-center">
                                                        <span className="font-mono text-gray-700 font-medium">{row.currentStock}</span>
                                                    </td>

                                                    {/* Input qty */}
                                                    <td className="px-3 py-2 text-center">
                                                        <input
                                                            type="number"
                                                            value={inputVal === 0 ? '' : inputVal}
                                                            onChange={e => setQty(row, e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                                                            onKeyDown={e => {
                                                                // Tab/Enter moves to next row's input
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    const inputs = document.querySelectorAll<HTMLInputElement>('input[data-stockinput]');
                                                                    const idx = Array.from(inputs).findIndex(el => el === e.currentTarget);
                                                                    inputs[idx + 1]?.focus();
                                                                }
                                                            }}
                                                            data-stockinput=""
                                                            min={mode === 'RECEIVE' ? 0 : undefined}
                                                            placeholder="0"
                                                            className={`w-20 text-center border rounded px-2 py-1 font-mono text-sm focus:outline-none transition-colors ${
                                                                hasError ? 'border-red-400 bg-red-50 focus:border-red-500' :
                                                                hasChange ? 'border-blue-400 bg-white focus:border-blue-500' :
                                                                'border-gray-200 bg-white focus:border-blue-400'
                                                            }`}
                                                        />
                                                    </td>

                                                    {/* New total */}
                                                    <td className="px-3 py-2 text-center">
                                                        {hasChange || mode === 'SET' ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <span className={`font-mono font-bold text-sm ${
                                                                    hasError ? 'text-red-500' :
                                                                    delta > 0 ? 'text-emerald-600' :
                                                                    delta < 0 ? 'text-red-500' :
                                                                    'text-gray-500'
                                                                }`}>
                                                                    {newTotal}
                                                                </span>
                                                                {delta !== 0 && (
                                                                    <span className={`text-[10px] font-mono ${delta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                        ({delta > 0 ? '+' : ''}{delta})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {visibleRows.length === 0 && (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        {search ? 'No products match your search' : 'All rows hidden — clear filter'}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Apply / Clear buttons */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={handleClearAll}
                            disabled={changedRows.length === 0}
                            className="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
                        >
                            Clear all changes
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={submitting || changedRows.length === 0}
                            className={`flex items-center gap-2 ${colorMap[modeConfig.color as keyof typeof colorMap]} text-white font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-all text-sm shadow-sm`}
                        >
                            {submitting ? (
                                <><RefreshCw size={15} className="animate-spin" /> Saving…</>
                            ) : (
                                <><CheckCircle size={15} /> Apply {changedRows.length} Change{changedRows.length !== 1 ? 's' : ''}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* RIGHT: Recent movements */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-700">Recent Movements</h2>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        {loadingMovements ? (
                            <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
                        ) : movements.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">No movements yet</div>
                        ) : (
                            <div className="divide-y divide-gray-50 max-h-[640px] overflow-y-auto">
                                {movements.map(m => (
                                    <div key={m.id} className="px-4 py-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <div className="text-xs font-medium text-gray-800 truncate">{m.product_name}</div>
                                                {m.variant_label && <div className="text-[11px] text-gray-400">{m.variant_label}</div>}
                                            </div>
                                            <span className={`font-mono font-bold text-sm flex-shrink-0 ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                m.type === 'RECEIVE' ? 'bg-emerald-50 text-emerald-700' :
                                                m.type === 'DAMAGE' ? 'bg-red-50 text-red-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>{m.type}</span>
                                            <span className="text-[11px] text-gray-400 font-mono">{m.previous_quantity}→{m.new_quantity}</span>
                                            <span className="text-[11px] text-gray-400 ml-auto">{fmtDate(m.created_at as string)}</span>
                                        </div>
                                        {m.reason && <div className="text-[11px] text-gray-400 mt-0.5 italic">{m.reason}</div>}
                                        {m.reference && <div className="text-[11px] text-gray-400">Ref: {m.reference}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tips */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800 space-y-1.5">
                        <div className="font-semibold flex items-center gap-1.5"><AlertTriangle size={12} /> Tips</div>
                        <div>• <strong>Receive Goods</strong> — type how many units arrived. Leave at 0 to skip.</div>
                        <div>• <strong>Stock Count</strong> — type the actual counted quantity for each variant.</div>
                        <div>• <strong>Write-off</strong> — type how many units to remove (damaged/lost).</div>
                        <div>• Press <kbd className="bg-amber-100 px-1 rounded">Enter</kbd> to jump to next row.</div>
                        <div>• Click the ▶ arrow to collapse/expand a product's variants.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
