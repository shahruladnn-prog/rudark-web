'use client';

import { useState, useEffect } from 'react';
import { getPromos, PromoCode } from '@/actions/promo-actions';
import { Tag, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PromoReportPage() {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const data = await getPromos();
        setPromos(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const activePromos = promos.filter(p => p.active);
    const totalUsage = promos.reduce((s, p) => s + (p.usage_count || 0), 0);
    const atLimit = promos.filter(p => p.usage_limit && p.usage_limit > 0 && p.usage_count >= p.usage_limit).length;

    return (
        <div className="max-w-4xl pb-20">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Tag size={20} className="text-violet-600" /> Promo Code Performance
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Usage counts and limits for all promo codes</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/promos" className="px-3 py-2 border border-gray-200 rounded text-sm text-gray-600 hover:border-gray-400">
                        Manage Promos
                    </Link>
                    <button onClick={load} disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 rounded text-sm disabled:opacity-50">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-gray-900">{promos.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total Codes</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-emerald-600">{activePromos.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Active</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">{totalUsage}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Total Uses</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-amber-500">{atLimit}</p>
                    <p className="text-xs text-gray-500 mt-0.5">At Limit</p>
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
                                    <th className="px-4 py-2.5 text-left">Code</th>
                                    <th className="px-4 py-2.5 text-left">Type</th>
                                    <th className="px-4 py-2.5 text-right">Discount Value</th>
                                    <th className="px-4 py-2.5 text-right">Min Spend</th>
                                    <th className="px-4 py-2.5 text-center">Used / Limit</th>
                                    <th className="px-4 py-2.5 text-center">Status</th>
                                    <th className="px-4 py-2.5 text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {promos.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No promo codes yet</td></tr>
                                ) : [...promos].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).map(p => {
                                    const isAtLimit = !!(p.usage_limit && p.usage_limit > 0 && p.usage_count >= p.usage_limit);
                                    const usagePct = p.usage_limit && p.usage_limit > 0 ? (p.usage_count / p.usage_limit) * 100 : null;
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">{p.code}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-semibold ${
                                                    p.type === 'percentage'
                                                        ? 'bg-violet-50 text-violet-700 border-violet-100'
                                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                    {p.type === 'percentage' ? '% Off' : 'Fixed'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                {p.type === 'percentage' ? `${p.value}%` : `RM ${p.value.toFixed(2)}`}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                                {p.min_spend ? `RM ${p.min_spend.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-xs font-semibold ${isAtLimit ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {p.usage_count}{p.usage_limit ? ` / ${p.usage_limit}` : ''}
                                                    </span>
                                                    {usagePct !== null && (
                                                        <div className="w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
                                                            <div className={`h-full rounded-full ${isAtLimit ? 'bg-red-400' : 'bg-blue-400'}`}
                                                                style={{ width: `${Math.min(100, usagePct)}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {p.active && !isAtLimit
                                                    ? <CheckCircle size={15} className="text-emerald-500 mx-auto" />
                                                    : <XCircle size={15} className="text-red-400 mx-auto" />
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-400 text-xs">
                                                {p.created_at ? new Date(p.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
