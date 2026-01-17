'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Archive, Download, RefreshCw, RotateCcw,
    Calendar, Package, AlertCircle, CheckCircle, Trash2
} from 'lucide-react';
import {
    getArchiveStats,
    getArchivableMovements,
    archiveOldMovements,
    getArchivedMovements,
    exportArchivedMovements,
    restoreArchivedMovement,
    ArchivedMovement
} from '@/actions/archive-actions';

export default function ArchiveManagementPage() {
    const [loading, setLoading] = useState(true);
    const [archiving, setArchiving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const [stats, setStats] = useState({ activeCount: 0, archiveCount: 0 });
    const [archivable, setArchivable] = useState({ count: 0, oldestDate: null as string | null });
    const [archivedMovements, setArchivedMovements] = useState<ArchivedMovement[]>([]);

    // Filters
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

    useEffect(() => {
        loadData();
    }, []);

    const handleArchive = async () => {
        if (!confirm(`Archive ${archivable.count} old stock movements? They will be moved to the archive collection.`)) {
            return;
        }

        setArchiving(true);
        setResult(null);

        try {
            const res = await archiveOldMovements(100);
            if (res.success) {
                setResult({ success: true, message: `Successfully archived ${res.archived} movements` });
                loadData();
            } else {
                setResult({ success: false, message: res.error || 'Archive failed' });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setArchiving(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await exportArchivedMovements({ dateFrom, dateTo });
            if (res.success && res.data) {
                // Create download
                const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `stock-movements-archive-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                setResult({ success: true, message: `Exported ${res.count} records` });
            } else {
                setResult({ success: false, message: res.error || 'Export failed' });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setExporting(false);
        }
    };

    const handleRestore = async (movementId: string) => {
        if (!confirm('Restore this movement back to active records?')) return;

        try {
            const res = await restoreArchivedMovement(movementId);
            if (res.success) {
                setResult({ success: true, message: 'Movement restored' });
                loadData();
            } else {
                setResult({ success: false, message: res.error || 'Restore failed' });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'RECEIVE': return 'text-green-400';
            case 'ADJUST': return 'text-blue-400';
            case 'DAMAGE': return 'text-red-400';
            case 'TRANSFER_IN': return 'text-purple-400';
            case 'TRANSFER_OUT': return 'text-orange-400';
            case 'SALE': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-rudark-grey pb-6 mb-8">
                <Link
                    href="/admin/stock"
                    className="p-2 text-gray-400 hover:text-rudark-volt transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl md:text-4xl font-condensed font-bold text-white uppercase mb-1">
                        Stock Movement <span className="text-rudark-volt">Archive</span>
                    </h1>
                    <p className="text-gray-500 font-mono text-xs md:text-sm">
                        View and manage archived stock movements
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-rudark-volt"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                    <div className="text-2xl font-bold text-white">{stats.activeCount}</div>
                    <div className="text-xs text-gray-500 uppercase">Active Records</div>
                </div>
                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                    <div className="text-2xl font-bold text-rudark-volt">{stats.archiveCount}</div>
                    <div className="text-xs text-gray-500 uppercase">Archived</div>
                </div>
                <div className="bg-rudark-carbon border border-yellow-500/30 rounded-sm p-4">
                    <div className="text-2xl font-bold text-yellow-400">{archivable.count}</div>
                    <div className="text-xs text-gray-500 uppercase">Ready to Archive</div>
                    {archivable.oldestDate && (
                        <div className="text-xs text-gray-600 mt-1">
                            From {formatDate(archivable.oldestDate).split(',')[0]}
                        </div>
                    )}
                </div>
                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4 flex flex-col justify-center">
                    <button
                        onClick={handleArchive}
                        disabled={archiving || archivable.count === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-rudark-volt text-black font-bold rounded-sm disabled:opacity-50"
                    >
                        {archiving ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Archive size={16} />
                        )}
                        Archive Old
                    </button>
                </div>
            </div>

            {/* Result Message */}
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

            {/* Export Section */}
            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4 mb-6">
                <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Export Archive</h2>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">From Date</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-rudark-matte border border-rudark-grey rounded-sm px-3 py-2 text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">To Date</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-rudark-matte border border-rudark-grey rounded-sm px-3 py-2 text-white text-sm"
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={exporting || stats.archiveCount === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-sm disabled:opacity-50"
                    >
                        {exporting ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Download size={16} />
                        )}
                        Download JSON
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Export up to 1,000 archived records as JSON file
                </p>
            </div>

            {/* Archived Movements Table */}
            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                <div className="p-4 border-b border-rudark-grey">
                    <h2 className="text-sm font-bold text-gray-400 uppercase">Archived Records</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : archivedMovements.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Archive size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No archived movements yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-rudark-matte">
                                <tr>
                                    <th className="text-left p-3 text-xs font-mono text-rudark-volt uppercase">Date</th>
                                    <th className="text-left p-3 text-xs font-mono text-rudark-volt uppercase">Product</th>
                                    <th className="text-left p-3 text-xs font-mono text-rudark-volt uppercase">Type</th>
                                    <th className="text-center p-3 text-xs font-mono text-rudark-volt uppercase">Qty</th>
                                    <th className="text-left p-3 text-xs font-mono text-rudark-volt uppercase">Reason</th>
                                    <th className="text-center p-3 text-xs font-mono text-rudark-volt uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {archivedMovements.map((m) => (
                                    <tr key={m.id} className="border-b border-rudark-grey/30 hover:bg-rudark-matte/50">
                                        <td className="p-3 text-sm text-gray-400 font-mono">
                                            {formatDate(m.created_at).split(',')[0]}
                                        </td>
                                        <td className="p-3">
                                            <div className="text-white text-sm">{m.product_name}</div>
                                            {m.variant_label && (
                                                <div className="text-xs text-gray-500">{m.variant_label}</div>
                                            )}
                                        </td>
                                        <td className={`p-3 text-sm font-mono ${getTypeColor(m.type)}`}>
                                            {m.type}
                                        </td>
                                        <td className="p-3 text-center font-mono">
                                            <span className={m.quantity >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {m.quantity >= 0 ? '+' : ''}{m.quantity}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm text-gray-400 max-w-xs truncate">
                                            {m.reason || '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => handleRestore(m.id)}
                                                className="text-gray-400 hover:text-rudark-volt p-1"
                                                title="Restore to active"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Footer Info */}
            <div className="mt-4 text-xs text-gray-500 text-center">
                Archive moves records older than 1 year. All data is preserved and can be restored anytime.
            </div>
        </div>
    );
}
