'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, Users, Clock, CheckCircle, XCircle, RefreshCw, Eye, ArrowRight } from 'lucide-react';
import { getConsignments } from '@/actions/consignment-actions';
import { Consignment, ConsignmentStatus, calculateConsignmentSummary } from '@/types/consignment';

const STATUS_STYLES: Record<ConsignmentStatus, string> = {
    'DRAFT':       'bg-gray-100 text-gray-600 border-gray-200',
    'ACTIVE':      'bg-blue-50 text-blue-700 border-blue-200',
    'RECONCILING': 'bg-amber-50 text-amber-700 border-amber-200',
    'CLOSED':      'bg-emerald-50 text-emerald-700 border-emerald-200',
    'CANCELLED':   'bg-red-50 text-red-600 border-red-200',
};

const STATUS_ICONS: Record<ConsignmentStatus, React.ReactNode> = {
    'DRAFT':       <Clock size={13} />,
    'ACTIVE':      <ArrowRight size={13} />,
    'RECONCILING': <RefreshCw size={13} />,
    'CLOSED':      <CheckCircle size={13} />,
    'CANCELLED':   <XCircle size={13} />,
};

export default function ConsignmentsPage() {
    const [consignments, setConsignments] = useState<Consignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ConsignmentStatus | 'ALL'>('ALL');

    useEffect(() => { loadConsignments(); }, [statusFilter]);

    const loadConsignments = async () => {
        setLoading(true);
        try {
            const data = await getConsignments(statusFilter === 'ALL' ? undefined : statusFilter);
            setConsignments(data);
        } catch { /* silent */ }
        setLoading(false);
    };

    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
    const fmtCur = (n: number) => `RM ${n.toFixed(2)}`;

    const stats = {
        total: consignments.length,
        active: consignments.filter(c => c.status === 'ACTIVE').length,
        reconciling: consignments.filter(c => c.status === 'RECONCILING').length,
        totalValue: consignments.filter(c => ['ACTIVE', 'RECONCILING'].includes(c.status))
            .reduce((s, c) => s + c.total_sent_value, 0),
    };

    return (
        <div className="max-w-6xl pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Consignments</h1>
                    <p className="text-sm text-gray-400">Manage inventory sent to partners on consignment</p>
                </div>
                <Link href="/admin/consignments/new"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Plus size={15} /> New Consignment
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Total</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-blue-600 mb-1">Active</div>
                    <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                </div>
                <div className="bg-white border border-amber-100 rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-amber-600 mb-1">Reconciling</div>
                    <div className="text-2xl font-bold text-amber-600">{stats.reconciling}</div>
                </div>
                <div className="bg-white border border-violet-100 rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Value Out</div>
                    <div className="text-lg font-bold text-violet-600">{fmtCur(stats.totalValue)}</div>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {(['ALL', 'DRAFT', 'ACTIVE', 'RECONCILING', 'CLOSED', 'CANCELLED'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold uppercase transition-colors ${
                            statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {s}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Loading consignments…</div>
                ) : consignments.length === 0 ? (
                    <div className="p-12 text-center">
                        <Package size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-400 text-sm">No consignments found</p>
                        <Link href="/admin/consignments/new" className="inline-block mt-3 text-blue-600 text-sm hover:underline">
                            Create your first consignment →
                        </Link>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Consignment #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Partner</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Items</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {consignments.map(c => {
                                const summary = calculateConsignmentSummary(c.items);
                                return (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{c.consignment_number}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-gray-400" />
                                                <div>
                                                    <div className="text-gray-900">{c.partner.name}</div>
                                                    {c.partner.contact_person && <div className="text-xs text-gray-400">{c.partner.contact_person}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="text-gray-900">{summary.total_sent_qty}</div>
                                            {summary.total_sold_qty > 0 && <div className="text-emerald-600 text-xs">-{summary.total_sold_qty} sold</div>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="text-gray-900 font-mono">{fmtCur(c.total_sent_value)}</div>
                                            {summary.total_sold_value > 0 && <div className="text-emerald-600 text-xs font-mono">{fmtCur(summary.total_sold_value)} sold</div>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${STATUS_STYLES[c.status]}`}>
                                                {STATUS_ICONS[c.status]} {c.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-gray-600 text-xs">{fmtDate(c.created_at)}</div>
                                            {c.sent_at && <div className="text-gray-400 text-xs">Sent: {fmtDate(c.sent_at)}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Link href={`/admin/consignments/${c.id}`}
                                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs">
                                                <Eye size={14} /> View
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
