'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, Users, Clock, CheckCircle, XCircle, RefreshCw, Eye, ArrowRight } from 'lucide-react';
import { getConsignments } from '@/actions/consignment-actions';
import { Consignment, ConsignmentStatus, calculateConsignmentSummary } from '@/types/consignment';

const STATUS_COLORS: Record<ConsignmentStatus, string> = {
    'DRAFT': 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    'ACTIVE': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'RECONCILING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'CLOSED': 'bg-green-500/20 text-green-400 border-green-500/50',
    'CANCELLED': 'bg-red-500/20 text-red-400 border-red-500/50'
};

const STATUS_ICONS: Record<ConsignmentStatus, React.ReactNode> = {
    'DRAFT': <Clock size={14} />,
    'ACTIVE': <ArrowRight size={14} />,
    'RECONCILING': <RefreshCw size={14} />,
    'CLOSED': <CheckCircle size={14} />,
    'CANCELLED': <XCircle size={14} />
};

export default function ConsignmentsPage() {
    const [consignments, setConsignments] = useState<Consignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ConsignmentStatus | 'ALL'>('ALL');

    useEffect(() => {
        loadConsignments();
    }, [statusFilter]);

    const loadConsignments = async () => {
        setLoading(true);
        try {
            const data = await getConsignments(statusFilter === 'ALL' ? undefined : statusFilter);
            setConsignments(data);
        } catch (error) {
            console.error('Failed to load consignments:', error);
        }
        setLoading(false);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return `RM ${amount.toFixed(2)}`;
    };

    // Calculate stats
    const stats = {
        total: consignments.length,
        active: consignments.filter(c => c.status === 'ACTIVE').length,
        reconciling: consignments.filter(c => c.status === 'RECONCILING').length,
        totalValue: consignments.filter(c => c.status === 'ACTIVE' || c.status === 'RECONCILING')
            .reduce((sum, c) => sum + c.total_sent_value, 0)
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                        <span className="text-purple-400">Consignments</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage inventory sent to partners on consignment
                    </p>
                </div>
                <Link
                    href="/admin/consignments/new"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold uppercase rounded-sm hover:bg-purple-500"
                >
                    <Plus size={18} />
                    New Consignment
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-rudark-carbon p-4 border border-rudark-grey rounded-sm">
                    <div className="text-gray-400 text-xs uppercase">Total</div>
                    <div className="text-2xl font-bold text-white">{stats.total}</div>
                </div>
                <div className="bg-rudark-carbon p-4 border border-blue-500/30 rounded-sm">
                    <div className="text-blue-400 text-xs uppercase">Active</div>
                    <div className="text-2xl font-bold text-blue-400">{stats.active}</div>
                </div>
                <div className="bg-rudark-carbon p-4 border border-yellow-500/30 rounded-sm">
                    <div className="text-yellow-400 text-xs uppercase">Reconciling</div>
                    <div className="text-2xl font-bold text-yellow-400">{stats.reconciling}</div>
                </div>
                <div className="bg-rudark-carbon p-4 border border-purple-500/30 rounded-sm">
                    <div className="text-gray-400 text-xs uppercase">Value Out</div>
                    <div className="text-xl font-bold text-purple-400">{formatCurrency(stats.totalValue)}</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
                {(['ALL', 'DRAFT', 'ACTIVE', 'RECONCILING', 'CLOSED', 'CANCELLED'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-sm text-sm font-bold uppercase transition-all ${statusFilter === status
                                ? 'bg-rudark-volt text-black'
                                : 'bg-rudark-carbon text-gray-400 hover:text-white border border-rudark-grey'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Consignments Table */}
            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading consignments...</div>
                ) : consignments.length === 0 ? (
                    <div className="p-8 text-center">
                        <Package size={48} className="mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400">No consignments found</p>
                        <Link
                            href="/admin/consignments/new"
                            className="inline-block mt-4 text-purple-400 hover:text-purple-300"
                        >
                            Create your first consignment →
                        </Link>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-rudark-matte text-gray-400 text-xs uppercase">
                            <tr>
                                <th className="p-4 text-left">Consignment #</th>
                                <th className="p-4 text-left">Partner</th>
                                <th className="p-4 text-center">Items</th>
                                <th className="p-4 text-right">Value</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-left">Date</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consignments.map(consignment => {
                                const summary = calculateConsignmentSummary(consignment.items);
                                return (
                                    <tr key={consignment.id} className="border-t border-rudark-grey/30 hover:bg-rudark-matte/50">
                                        <td className="p-4">
                                            <div className="text-white font-mono font-bold">{consignment.consignment_number}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Users size={16} className="text-gray-500" />
                                                <div>
                                                    <div className="text-white">{consignment.partner.name}</div>
                                                    {consignment.partner.contact_person && (
                                                        <div className="text-gray-500 text-xs">{consignment.partner.contact_person}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="text-white">{summary.total_sent_qty}</div>
                                            {summary.total_sold_qty > 0 && (
                                                <div className="text-green-400 text-xs">-{summary.total_sold_qty} sold</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="text-purple-400 font-mono">{formatCurrency(consignment.total_sent_value)}</div>
                                            {summary.total_sold_value > 0 && (
                                                <div className="text-green-400 text-xs font-mono">
                                                    {formatCurrency(summary.total_sold_value)} sold
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${STATUS_COLORS[consignment.status]}`}>
                                                {STATUS_ICONS[consignment.status]}
                                                {consignment.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-gray-400 text-sm">{formatDate(consignment.created_at)}</div>
                                            {consignment.sent_at && (
                                                <div className="text-gray-500 text-xs">Sent: {formatDate(consignment.sent_at)}</div>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link
                                                href={`/admin/consignments/${consignment.id}`}
                                                className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300"
                                            >
                                                <Eye size={16} />
                                                View
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
