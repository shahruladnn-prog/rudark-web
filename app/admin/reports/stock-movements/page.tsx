'use client';

import { useState, useEffect, useMemo } from 'react';
import { getStockMovements, StockMovement } from '@/actions/stock-movement-actions';
import { Activity, Download, Search, RefreshCw } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
    RECEIVE:       'bg-emerald-50 text-emerald-700 border-emerald-100',
    ADJUST:        'bg-blue-50 text-blue-700 border-blue-100',
    DAMAGE:        'bg-red-50 text-red-700 border-red-100',
    TRANSFER_IN:   'bg-violet-50 text-violet-700 border-violet-100',
    TRANSFER_OUT:  'bg-amber-50 text-amber-700 border-amber-100',
    SALE:          'bg-gray-100 text-gray-600 border-gray-200',
    RETURN:        'bg-orange-50 text-orange-700 border-orange-100',
};

const TYPES = ['ALL', 'RECEIVE', 'ADJUST', 'DAMAGE', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE', 'RETURN'];

function exportCsv(data: StockMovement[]) {
    const rows = [
        'Date,Product,Variant SKU,Variant,Type,Qty Change,Before,After,Reason,Reference,Store',
        ...data.map(m => [
            m.created_at ? new Date(m.created_at).toLocaleString('en-MY') : '',
            `"${m.product_name}"`,
            m.variant_sku || '',
            `"${m.variant_label || ''}"`,
            m.type,
            m.quantity > 0 ? `+${m.quantity}` : String(m.quantity),
            m.previous_quantity,
            m.new_quantity,
            `"${m.reason || ''}"`,
            m.reference || '',
            m.store_id || '',
        ].join(','))
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function StockMovementsPage() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        const data = await getStockMovements(500);
        setMovements(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return movements.filter(m => {
            if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
            if (q && !m.product_name.toLowerCase().includes(q) &&
                !(m.variant_sku || '').toLowerCase().includes(q) &&
                !(m.variant_label || '').toLowerCase().includes(q) &&
                !(m.reference || '').toLowerCase().includes(q) &&
                !(m.reason || '').toLowerCase().includes(q)) return false;
            return true;
        });
    }, [movements, typeFilter, search]);

    return (
        <div className="max-w-6xl pb-20">
            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity size={20} className="text-blue-600" /> Stock Movement Ledger
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Last {movements.length} movements · all channels</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 rounded text-sm disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={() => exportCsv(filtered)}
                        disabled={filtered.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search product, SKU, reason, reference…"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 placeholder-gray-400"
                    />
                </div>
                <div className="flex flex-wrap gap-1">
                    {TYPES.map(t => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-2.5 py-1.5 text-xs rounded border font-medium transition-colors ${
                                typeFilter === t
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-400'
                            }`}
                        >
                            {t === 'ALL' ? 'All Types' : t.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-20 text-gray-400 text-sm">Loading movements…</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">
                        {filtered.length} movement{filtered.length !== 1 ? 's' : ''}
                        {typeFilter !== 'ALL' || search ? ` (filtered from ${movements.length})` : ''}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                                    <th className="px-4 py-2.5 text-left">Product</th>
                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Type</th>
                                    <th className="px-4 py-2.5 text-right whitespace-nowrap">Qty Change</th>
                                    <th className="px-4 py-2.5 text-right whitespace-nowrap">Before → After</th>
                                    <th className="px-4 py-2.5 text-left">Reason</th>
                                    <th className="px-4 py-2.5 text-left">Reference</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                            {search || typeFilter !== 'ALL' ? 'No movements match your filter' : 'No stock movements recorded yet'}
                                        </td>
                                    </tr>
                                ) : filtered.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                            {m.created_at
                                                ? new Date(m.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{m.product_name}</p>
                                            {m.variant_label && (
                                                <p className="text-xs text-gray-400 mt-0.5">{m.variant_label}</p>
                                            )}
                                            {m.variant_sku && (
                                                <p className="text-[10px] font-mono text-gray-300">{m.variant_sku}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-semibold ${TYPE_COLORS[m.type] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {m.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">
                                            <span className={m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap font-mono">
                                            {m.previous_quantity} → {m.new_quantity}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                                            <span className="truncate block">{m.reason || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                                            {m.reference || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
