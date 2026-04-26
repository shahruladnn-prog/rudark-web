'use client';

import { useState, useEffect } from 'react';
import { getAdminLogs, AdminLog } from '@/actions/admin-log-actions';
import { Shield, RefreshCw, Search } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
    STATUS_CHANGE:       'bg-blue-50 text-blue-700 border-blue-100',
    BULK_STATUS_CHANGE:  'bg-indigo-50 text-indigo-700 border-indigo-100',
    PRODUCT_SAVE:        'bg-emerald-50 text-emerald-700 border-emerald-100',
    STOCK_ADJUST:        'bg-amber-50 text-amber-700 border-amber-100',
    REFUND:              'bg-orange-50 text-orange-700 border-orange-100',
    SYNC:                'bg-teal-50 text-teal-700 border-teal-100',
};

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        const data = await getAdminLogs(200);
        setLogs(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const filtered = search
        ? logs.filter(l =>
            l.action.toLowerCase().includes(search.toLowerCase()) ||
            l.entity_id.toLowerCase().includes(search.toLowerCase()) ||
            l.entity_type.toLowerCase().includes(search.toLowerCase())
        )
        : logs;

    return (
        <div className="max-w-5xl pb-20">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield size={20} className="text-blue-600" /> Activity Log
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Last {logs.length} admin actions</p>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 rounded text-sm disabled:opacity-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 shadow-sm">
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by action, entity ID…"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 placeholder-gray-400" />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Time</th>
                                    <th className="px-4 py-2.5 text-left">Action</th>
                                    <th className="px-4 py-2.5 text-left">Type</th>
                                    <th className="px-4 py-2.5 text-left">Entity</th>
                                    <th className="px-4 py-2.5 text-left">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                                        {search ? 'No matching logs' : 'No activity logged yet — logs appear when admins make changes'}
                                    </td></tr>
                                ) : filtered.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                            {log.created_at
                                                ? new Date(log.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 capitalize">{log.entity_type}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-gray-700 max-w-[180px] truncate">{log.entity_id}</td>
                                        <td className="px-4 py-3 text-xs text-gray-400">
                                            {log.details && Object.keys(log.details).length > 0
                                                ? Object.entries(log.details)
                                                    .filter(([, v]) => v !== undefined && v !== null && v !== '')
                                                    .map(([k, v]) => `${k}: ${v}`)
                                                    .join(' · ')
                                                : '—'}
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
