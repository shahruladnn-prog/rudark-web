'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Archive, Download, RefreshCw, RotateCcw } from 'lucide-react';
import {
    getArchiveStats,
    getArchivableMovements,
    archiveOldMovements,
    getArchivedMovements,
    exportArchivedMovements,
    restoreArchivedMovement,
    ArchivedMovement
} from '@/actions/archive-actions';
import { useToast } from '@/components/ui/toast';

export default function ArchiveManagementPage() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [archiving, setArchiving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [stats, setStats] = useState({ activeCount: 0, archiveCount: 0 });
    const [archivable, setArchivable] = useState({ count: 0, oldestDate: null as string | null });
    const [archivedMovements, setArchivedMovements] = useState<ArchivedMovement[]>([]);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsData, archivableData, movementsData] = await Promise.all([
                getArchiveStats(),
                getArchivableMovements(),
                getArchivedMovements({ limit: 50 })
            ]);
            setStats(statsData);
            setArchivable(archivableData);
            setArchivedMovements(movementsData);
        } catch (error) {
            console.error('Failed to load archive data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleArchive = async () => {
        if (!confirm(`Archive ${archivable.count} old stock movements?`)) return;
        setArchiving(true);
        try {
            const res = await archiveOldMovements(100);
            if (res.success) {
                showToast('success', `Archived ${res.archived} movements`);
                loadData();
            } else {
                showToast('error', res.error || 'Archive failed');
            }
        } catch (error: any) {
            showToast('error', error.message);
        } finally {
            setArchiving(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await exportArchivedMovements({ dateFrom, dateTo });
            if (res.success && res.data) {
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `stock-movements-archive-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showToast('success', `Exported ${res.count} records`);
            } else {
                showToast('error', res.error || 'Export failed');
            }
        } catch (error: any) {
            showToast('error', error.message);
        } finally {
            setExporting(false);
        }
    };

    const handleRestore = async (movementId: string) => {
        if (!confirm('Restore this movement back to active records?')) return;
        try {
            const res = await restoreArchivedMovement(movementId);
            if (res.success) {
                showToast('success', 'Movement restored');
                loadData();
            } else {
                showToast('error', res.error || 'Restore failed');
            }
        } catch (error: any) {
            showToast('error', error.message);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const TYPE_COLORS: Record<string, string> = {
        RECEIVE: 'text-emerald-600',
        ADJUST: 'text-blue-600',
        DAMAGE: 'text-red-500',
        TRANSFER_IN: 'text-purple-600',
        TRANSFER_OUT: 'text-orange-500',
        SALE: 'text-amber-600',
    };

    const inp = "border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400";

    return (
        <div className="max-w-6xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900">Stock Movement Archive</h1>
                    <p className="text-sm text-gray-400">View and manage archived stock movements</p>
                </div>
                <button onClick={loadData} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{stats.activeCount}</div>
                    <div className="text-xs text-gray-400 uppercase">Active Records</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{stats.archiveCount}</div>
                    <div className="text-xs text-gray-400 uppercase">Archived</div>
                </div>
                <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-amber-600">{archivable.count}</div>
                    <div className="text-xs text-gray-400 uppercase">Ready to Archive</div>
                    {archivable.oldestDate && (
                        <div className="text-xs text-gray-400 mt-1">From {formatDate(archivable.oldestDate).split(',')[0]}</div>
                    )}
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-center">
                    <button onClick={handleArchive} disabled={archiving || archivable.count === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                        {archiving ? <RefreshCw size={14} className="animate-spin" /> : <Archive size={14} />}
                        Archive Old
                    </button>
                </div>
            </div>

            {/* Export Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Export Archive</h2>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">From Date</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inp} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">To Date</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inp} />
                    </div>
                    <button onClick={handleExport} disabled={exporting || stats.archiveCount === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-medium rounded hover:bg-gray-800 disabled:opacity-50 text-sm">
                        {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        Download JSON
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Export up to 1,000 archived records as JSON file</p>
            </div>

            {/* Archived Movements Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">Archived Records</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
                ) : archivedMovements.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <Archive size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No archived movements yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-3 text-xs text-gray-500 uppercase font-medium">Date</th>
                                    <th className="text-left p-3 text-xs text-gray-500 uppercase font-medium">Product</th>
                                    <th className="text-left p-3 text-xs text-gray-500 uppercase font-medium">Type</th>
                                    <th className="text-center p-3 text-xs text-gray-500 uppercase font-medium">Qty</th>
                                    <th className="text-left p-3 text-xs text-gray-500 uppercase font-medium">Reason</th>
                                    <th className="text-center p-3 text-xs text-gray-500 uppercase font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {archivedMovements.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3 text-sm text-gray-500 font-mono">
                                            {formatDate(m.created_at).split(',')[0]}
                                        </td>
                                        <td className="p-3">
                                            <div className="text-gray-900 text-sm">{m.product_name}</div>
                                            {m.variant_label && <div className="text-xs text-gray-400">{m.variant_label}</div>}
                                        </td>
                                        <td className={`p-3 text-sm font-mono font-medium ${TYPE_COLORS[m.type] || 'text-gray-500'}`}>
                                            {m.type}
                                        </td>
                                        <td className="p-3 text-center font-mono text-sm">
                                            <span className={m.quantity >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                                {m.quantity >= 0 ? '+' : ''}{m.quantity}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm text-gray-500 max-w-xs truncate">{m.reason || '-'}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleRestore(m.id)}
                                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Restore to active">
                                                <RotateCcw size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <p className="mt-4 text-xs text-gray-400 text-center">
                Archive moves records older than 1 year. All data is preserved and can be restored anytime.
            </p>
        </div>
    );
}
