'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Send, Package, Users, Calendar, CheckCircle, XCircle,
    DollarSign, RotateCcw, AlertTriangle, Clock, RefreshCw, Trash2
} from 'lucide-react';
import {
    getConsignment,
    sendConsignment,
    recordConsignmentSales,
    reconcileConsignment,
    closeConsignment,
    cancelConsignment
} from '@/actions/consignment-actions';
import { Consignment, ConsignmentItem, ConsignmentStatus, calculateConsignmentSummary } from '@/types/consignment';

const STATUS_COLORS: Record<ConsignmentStatus, string> = {
    'DRAFT': 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    'ACTIVE': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'RECONCILING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'CLOSED': 'bg-green-500/20 text-green-400 border-green-500/50',
    'CANCELLED': 'bg-red-500/20 text-red-400 border-red-500/50'
};

interface PageParams {
    params: Promise<{ id: string }>;
}

export default function ConsignmentDetailPage({ params }: PageParams) {
    const router = useRouter();
    const resolvedParams = use(params);
    const consignmentId = resolvedParams.id;

    const [consignment, setConsignment] = useState<Consignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Sales recording modal
    const [showSalesModal, setShowSalesModal] = useState(false);
    const [salesData, setSalesData] = useState<Record<string, number>>({});

    // Reconciliation modal
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [reconcileData, setReconcileData] = useState<Record<string, { returned: number; lost: number }>>({});

    useEffect(() => {
        loadConsignment();
    }, [consignmentId]);

    const loadConsignment = async () => {
        setLoading(true);
        try {
            const data = await getConsignment(consignmentId);
            setConsignment(data);

            // Initialize reconcile data
            if (data) {
                const initReconcile: Record<string, { returned: number; lost: number }> = {};
                data.items.forEach(item => {
                    const key = `${item.product_id}-${item.variant_sku || ''}`;
                    const pending = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
                    initReconcile[key] = { returned: pending, lost: 0 };
                });
                setReconcileData(initReconcile);
            }
        } catch (error) {
            console.error('Failed to load consignment:', error);
        }
        setLoading(false);
    };

    const handleSend = async () => {
        if (!confirm('Send this consignment to partner? Stock will be deducted from inventory.')) return;

        setProcessing(true);
        try {
            const result = await sendConsignment(consignmentId);
            if (result.success) {
                await loadConsignment();
            } else {
                alert('Failed to send: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error);
        }
        setProcessing(false);
    };

    const handleRecordSales = async () => {
        const salesArray = Object.entries(salesData)
            .filter(([_, qty]) => qty > 0)
            .map(([key, qty]) => {
                const [product_id, variant_sku] = key.split('-');
                return { product_id, variant_sku: variant_sku || undefined, quantity_sold: qty };
            });

        if (salesArray.length === 0) {
            alert('No sales to record');
            return;
        }

        setProcessing(true);
        try {
            const result = await recordConsignmentSales(consignmentId, salesArray);
            if (result.success) {
                setShowSalesModal(false);
                setSalesData({});
                await loadConsignment();
            } else {
                alert('Failed to record sales: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error);
        }
        setProcessing(false);
    };

    const handleReconcile = async () => {
        const reconcileArray = Object.entries(reconcileData)
            .filter(([_, data]) => data.returned > 0 || data.lost > 0)
            .map(([key, data]) => {
                const [product_id, variant_sku] = key.split('-');
                return {
                    product_id,
                    variant_sku: variant_sku || undefined,
                    quantity_returned: data.returned,
                    quantity_lost: data.lost
                };
            });

        if (reconcileArray.length === 0) {
            alert('No items to reconcile');
            return;
        }

        if (!confirm('Reconcile these items? Returned stock will be added back to inventory.')) return;

        setProcessing(true);
        try {
            const result = await reconcileConsignment(consignmentId, reconcileArray);
            if (result.success) {
                setShowReconcileModal(false);
                await loadConsignment();
            } else {
                alert('Failed to reconcile: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error);
        }
        setProcessing(false);
    };

    const handleClose = async () => {
        if (!confirm('Close this consignment? This action cannot be undone.')) return;

        setProcessing(true);
        try {
            const result = await closeConsignment(consignmentId);
            if (result.success) {
                await loadConsignment();
            } else {
                alert('Failed to close: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error);
        }
        setProcessing(false);
    };

    const handleCancel = async () => {
        if (!confirm('Cancel this consignment? Stock will be restored if already sent.')) return;

        setProcessing(true);
        try {
            const result = await cancelConsignment(consignmentId);
            if (result.success) {
                await loadConsignment();
            } else {
                alert('Failed to cancel: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error);
        }
        setProcessing(false);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => `RM ${amount.toFixed(2)}`;

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto py-20 text-center text-gray-400">
                Loading consignment...
            </div>
        );
    }

    if (!consignment) {
        return (
            <div className="max-w-5xl mx-auto py-20 text-center">
                <p className="text-red-400">Consignment not found</p>
                <Link href="/admin/consignments" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
                    Back to Consignments
                </Link>
            </div>
        );
    }

    const summary = calculateConsignmentSummary(consignment.items);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <Link href="/admin/consignments" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
                        <ArrowLeft size={16} />
                        Back to Consignments
                    </Link>
                    <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                        <span className="text-purple-400">{consignment.consignment_number}</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {consignment.partner.name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded text-sm border ${STATUS_COLORS[consignment.status]}`}>
                        {consignment.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Action Bar */}
                    <div className="bg-rudark-carbon p-4 border border-rudark-grey rounded-sm flex flex-wrap gap-3">
                        {consignment.status === 'DRAFT' && (
                            <>
                                <button
                                    onClick={handleSend}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-sm hover:bg-blue-500 disabled:opacity-50"
                                >
                                    <Send size={16} />
                                    Send to Partner
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 rounded-sm hover:bg-red-500/10"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </>
                        )}

                        {consignment.status === 'ACTIVE' && (
                            <>
                                <button
                                    onClick={() => setShowSalesModal(true)}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-sm hover:bg-green-500 disabled:opacity-50"
                                >
                                    <DollarSign size={16} />
                                    Record Sales
                                </button>
                                <button
                                    onClick={() => setShowReconcileModal(true)}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-bold rounded-sm hover:bg-yellow-500 disabled:opacity-50"
                                >
                                    <RotateCcw size={16} />
                                    Reconcile Returns
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-400 rounded-sm hover:bg-red-500/10"
                                >
                                    <XCircle size={16} />
                                    Cancel
                                </button>
                            </>
                        )}

                        {consignment.status === 'RECONCILING' && (
                            <>
                                <button
                                    onClick={() => setShowReconcileModal(true)}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-bold rounded-sm hover:bg-yellow-500 disabled:opacity-50"
                                >
                                    <RotateCcw size={16} />
                                    Continue Reconciling
                                </button>
                                <button
                                    onClick={handleClose}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-sm hover:bg-green-500 disabled:opacity-50"
                                >
                                    <CheckCircle size={16} />
                                    Force Close
                                </button>
                            </>
                        )}

                        {consignment.status === 'CLOSED' && (
                            <span className="text-green-400 flex items-center gap-2">
                                <CheckCircle size={16} />
                                This consignment is closed
                            </span>
                        )}

                        {consignment.status === 'CANCELLED' && (
                            <span className="text-red-400 flex items-center gap-2">
                                <XCircle size={16} />
                                This consignment was cancelled
                            </span>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                        <div className="p-4 border-b border-rudark-grey">
                            <h2 className="text-lg font-bold text-white uppercase flex items-center gap-2">
                                <Package size={20} />
                                Items ({consignment.items.length})
                            </h2>
                        </div>
                        <table className="w-full">
                            <thead className="bg-rudark-matte text-gray-400 text-xs uppercase">
                                <tr>
                                    <th className="p-3 text-left">Product</th>
                                    <th className="p-3 text-center">Sent</th>
                                    <th className="p-3 text-center">Sold</th>
                                    <th className="p-3 text-center">Returned</th>
                                    <th className="p-3 text-center">Lost</th>
                                    <th className="p-3 text-center">Pending</th>
                                    <th className="p-3 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consignment.items.map((item, index) => {
                                    const pending = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
                                    return (
                                        <tr key={index} className="border-t border-rudark-grey/30">
                                            <td className="p-3">
                                                <div className="text-white">{item.product_name}</div>
                                                {item.variant_label && (
                                                    <div className="text-gray-500 text-xs">{item.variant_label}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-white">{item.quantity_sent}</td>
                                            <td className="p-3 text-center text-green-400">{item.quantity_sold || '-'}</td>
                                            <td className="p-3 text-center text-blue-400">{item.quantity_returned || '-'}</td>
                                            <td className="p-3 text-center text-red-400">{item.quantity_lost || '-'}</td>
                                            <td className="p-3 text-center">
                                                {pending > 0 ? (
                                                    <span className="text-yellow-400 font-bold">{pending}</span>
                                                ) : (
                                                    <span className="text-green-400">✓</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right text-purple-400 font-mono">
                                                {formatCurrency(item.quantity_sent * item.unit_price)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-rudark-carbon p-6 border border-purple-500/30 rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">Summary</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Sent:</span>
                                <span className="text-white">{summary.total_sent_qty} pcs</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Sold:</span>
                                <span className="text-green-400">{summary.total_sold_qty} pcs</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Returned:</span>
                                <span className="text-blue-400">{summary.total_returned_qty} pcs</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Lost:</span>
                                <span className="text-red-400">{summary.total_lost_qty} pcs</span>
                            </div>
                            <div className="flex justify-between border-t border-rudark-grey pt-3">
                                <span className="text-gray-400">Pending:</span>
                                <span className={summary.total_pending_qty > 0 ? 'text-yellow-400 font-bold' : 'text-green-400'}>
                                    {summary.total_pending_qty} pcs
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Financial */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">Financial</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Sent Value:</span>
                                <span className="text-purple-400 font-mono">{formatCurrency(consignment.total_sent_value)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Sold Value:</span>
                                <span className="text-green-400 font-mono">{formatCurrency(consignment.total_sold_value)}</span>
                            </div>
                            {consignment.commission_rate && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Commission ({consignment.commission_rate}%):</span>
                                    <span className="text-yellow-400 font-mono">
                                        {formatCurrency(consignment.total_sold_value * (consignment.commission_rate / 100))}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-rudark-grey pt-3">
                                <span className="text-gray-400">Lost Value:</span>
                                <span className="text-red-400 font-mono">{formatCurrency(consignment.total_lost_value)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Partner */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                            <Users size={18} />
                            Partner
                        </h2>
                        <div className="space-y-2 text-sm">
                            <div className="text-white font-medium">{consignment.partner.name}</div>
                            {consignment.partner.contact_person && (
                                <div className="text-gray-400">{consignment.partner.contact_person}</div>
                            )}
                            {consignment.partner.phone && (
                                <div className="text-gray-400">{consignment.partner.phone}</div>
                            )}
                            {consignment.partner.email && (
                                <div className="text-gray-400">{consignment.partner.email}</div>
                            )}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4 flex items-center gap-2">
                            <Calendar size={18} />
                            Timeline
                        </h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Created:</span>
                                <span className="text-white">{formatDate(consignment.created_at)}</span>
                            </div>
                            {consignment.sent_at && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Sent:</span>
                                    <span className="text-blue-400">{formatDate(consignment.sent_at)}</span>
                                </div>
                            )}
                            {consignment.expected_return_date && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Expected Return:</span>
                                    <span className="text-yellow-400">{formatDate(consignment.expected_return_date)}</span>
                                </div>
                            )}
                            {consignment.closed_at && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Closed:</span>
                                    <span className="text-green-400">{formatDate(consignment.closed_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Modal */}
            {showSalesModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm max-w-xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-4 border-b border-rudark-grey">
                            <h2 className="text-xl font-bold text-white uppercase">Record Sales</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            {consignment.items.map((item, index) => {
                                const key = `${item.product_id}-${item.variant_sku || ''}`;
                                const available = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
                                return (
                                    <div key={index} className="flex justify-between items-center p-3 bg-rudark-matte rounded-sm">
                                        <div>
                                            <div className="text-white">{item.product_name}</div>
                                            {item.variant_label && <div className="text-gray-500 text-xs">{item.variant_label}</div>}
                                            <div className="text-gray-400 text-xs">Available: {available}</div>
                                        </div>
                                        <input
                                            type="number"
                                            min={0}
                                            max={available}
                                            value={salesData[key] || 0}
                                            onChange={(e) => setSalesData({ ...salesData, [key]: parseInt(e.target.value) || 0 })}
                                            className="w-20 bg-rudark-carbon border border-rudark-grey text-white text-center py-2 rounded-sm"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-rudark-grey flex justify-end gap-3">
                            <button
                                onClick={() => setShowSalesModal(false)}
                                className="px-4 py-2 border border-rudark-grey text-gray-300 rounded-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordSales}
                                disabled={processing}
                                className="px-4 py-2 bg-green-600 text-white font-bold rounded-sm disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Sales'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconcile Modal */}
            {showReconcileModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-4 border-b border-rudark-grey">
                            <h2 className="text-xl font-bold text-white uppercase">Reconcile Returns</h2>
                            <p className="text-gray-400 text-sm">Specify how many items were returned vs lost</p>
                        </div>
                        <div className="p-4 space-y-4">
                            {consignment.items.map((item, index) => {
                                const key = `${item.product_id}-${item.variant_sku || ''}`;
                                const pending = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
                                if (pending <= 0) return null;

                                return (
                                    <div key={index} className="p-4 bg-rudark-matte rounded-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="text-white">{item.product_name}</div>
                                                {item.variant_label && <div className="text-gray-500 text-xs">{item.variant_label}</div>}
                                            </div>
                                            <div className="text-yellow-400 font-bold">{pending} pending</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-gray-400 text-xs block mb-1">Returned (good)</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={pending}
                                                    value={reconcileData[key]?.returned || 0}
                                                    onChange={(e) => {
                                                        const returned = parseInt(e.target.value) || 0;
                                                        setReconcileData({
                                                            ...reconcileData,
                                                            [key]: { ...reconcileData[key], returned }
                                                        });
                                                    }}
                                                    className="w-full bg-rudark-carbon border border-rudark-grey text-white text-center py-2 rounded-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-red-400 text-xs block mb-1">Lost/Damaged</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={pending}
                                                    value={reconcileData[key]?.lost || 0}
                                                    onChange={(e) => {
                                                        const lost = parseInt(e.target.value) || 0;
                                                        setReconcileData({
                                                            ...reconcileData,
                                                            [key]: { ...reconcileData[key], lost }
                                                        });
                                                    }}
                                                    className="w-full bg-rudark-carbon border border-red-500/50 text-white text-center py-2 rounded-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-rudark-grey flex justify-end gap-3">
                            <button
                                onClick={() => setShowReconcileModal(false)}
                                className="px-4 py-2 border border-rudark-grey text-gray-300 rounded-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReconcile}
                                disabled={processing}
                                className="px-4 py-2 bg-yellow-600 text-white font-bold rounded-sm disabled:opacity-50"
                            >
                                {processing ? 'Processing...' : 'Confirm Reconciliation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
