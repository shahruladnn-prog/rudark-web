'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Send, Package, Users, Calendar, CheckCircle, XCircle,
    DollarSign, RotateCcw, Trash2
} from 'lucide-react';
import {
    getConsignment,
    sendConsignment,
    recordConsignmentSales,
    reconcileConsignment,
    closeConsignment,
    cancelConsignment
} from '@/actions/consignment-actions';
import { Consignment, ConsignmentStatus, calculateConsignmentSummary } from '@/types/consignment';
import { useToast } from '@/components/ui/toast';

const STATUS_STYLES: Record<ConsignmentStatus, string> = {
    'DRAFT': 'bg-gray-100 text-gray-600 border border-gray-200',
    'ACTIVE': 'bg-blue-50 text-blue-600 border border-blue-200',
    'RECONCILING': 'bg-amber-50 text-amber-600 border border-amber-200',
    'CLOSED': 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    'CANCELLED': 'bg-red-50 text-red-500 border border-red-200'
};

interface PageParams {
    params: Promise<{ id: string }>;
}

export default function ConsignmentDetailPage({ params }: PageParams) {
    const router = useRouter();
    const { showToast } = useToast();
    const resolvedParams = use(params);
    const consignmentId = resolvedParams.id;

    const [consignment, setConsignment] = useState<Consignment | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [showSalesModal, setShowSalesModal] = useState(false);
    const [salesData, setSalesData] = useState<Record<string, number>>({});

    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [reconcileData, setReconcileData] = useState<Record<string, { returned: number; lost: number }>>({});

    useEffect(() => { loadConsignment(); }, [consignmentId]);

    const loadConsignment = async () => {
        setLoading(true);
        try {
            const data = await getConsignment(consignmentId);
            setConsignment(data);
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
            if (result.success) { await loadConsignment(); }
            else showToast('error', 'Failed to send: ' + result.error);
        } catch (error) { showToast('error', 'An error occurred: ' + error); }
        setProcessing(false);
    };

    const handleRecordSales = async () => {
        const salesArray = Object.entries(salesData)
            .filter(([_, qty]) => qty > 0)
            .map(([key, qty]) => {
                const [product_id, variant_sku] = key.split('-');
                return { product_id, variant_sku: variant_sku || undefined, quantity_sold: qty };
            });
        if (salesArray.length === 0) { showToast('warning', 'No sales to record'); return; }
        setProcessing(true);
        try {
            const result = await recordConsignmentSales(consignmentId, salesArray);
            if (result.success) { setShowSalesModal(false); setSalesData({}); await loadConsignment(); }
            else showToast('error', 'Failed to record sales: ' + result.error);
        } catch (error) { showToast('error', 'An error occurred: ' + error); }
        setProcessing(false);
    };

    const handleReconcile = async () => {
        const reconcileArray = Object.entries(reconcileData)
            .filter(([_, data]) => data.returned > 0 || data.lost > 0)
            .map(([key, data]) => {
                const [product_id, variant_sku] = key.split('-');
                return { product_id, variant_sku: variant_sku || undefined, quantity_returned: data.returned, quantity_lost: data.lost };
            });
        if (reconcileArray.length === 0) { showToast('warning', 'No items to reconcile'); return; }
        if (!confirm('Reconcile these items? Returned stock will be added back to inventory.')) return;
        setProcessing(true);
        try {
            const result = await reconcileConsignment(consignmentId, reconcileArray);
            if (result.success) { setShowReconcileModal(false); await loadConsignment(); }
            else showToast('error', 'Failed to reconcile: ' + result.error);
        } catch (error) { showToast('error', 'An error occurred: ' + error); }
        setProcessing(false);
    };

    const handleClose = async () => {
        if (!confirm('Close this consignment? This action cannot be undone.')) return;
        setProcessing(true);
        try {
            const result = await closeConsignment(consignmentId);
            if (result.success) { await loadConsignment(); }
            else showToast('error', 'Failed to close: ' + result.error);
        } catch (error) { showToast('error', 'An error occurred: ' + error); }
        setProcessing(false);
    };

    const handleCancel = async () => {
        if (!confirm('Cancel this consignment? Stock will be restored if already sent.')) return;
        setProcessing(true);
        try {
            const result = await cancelConsignment(consignmentId);
            if (result.success) { await loadConsignment(); }
            else showToast('error', 'Failed to cancel: ' + result.error);
        } catch (error) { showToast('error', 'An error occurred: ' + error); }
        setProcessing(false);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-MY', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => `RM ${amount.toFixed(2)}`;

    if (loading) return <div className="max-w-5xl py-20 text-center text-gray-400 text-sm">Loading consignment…</div>;

    if (!consignment) return (
        <div className="max-w-5xl py-20 text-center">
            <p className="text-red-500 mb-4">Consignment not found</p>
            <Link href="/admin/consignments" className="text-blue-600 hover:underline text-sm">Back to Consignments</Link>
        </div>
    );

    const summary = calculateConsignmentSummary(consignment.items);

    const inp = "w-full border border-gray-200 rounded px-3 py-2 text-center text-sm focus:outline-none focus:border-blue-400";

    return (
        <div className="max-w-5xl pb-20">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Link href="/admin/consignments" className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-3 text-sm">
                        <ArrowLeft size={16} /> Back to Consignments
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">{consignment.consignment_number}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{consignment.partner.name}</p>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${STATUS_STYLES[consignment.status]}`}>
                    {consignment.status}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Action Bar */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap gap-2">
                        {consignment.status === 'DRAFT' && (
                            <>
                                <button onClick={handleSend} disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                                    <Send size={15} /> Send to Partner
                                </button>
                                <button onClick={handleCancel} disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded hover:bg-red-50 text-sm">
                                    <Trash2 size={15} /> Delete
                                </button>
                            </>
                        )}
                        {consignment.status === 'ACTIVE' && (
                            <>
                                <button onClick={() => setShowSalesModal(true)} disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 disabled:opacity-50 text-sm">
                                    <DollarSign size={15} /> Record Sales
                                </button>
                                <button onClick={() => setShowReconcileModal(true)} disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded hover:bg-amber-600 disabled:opacity-50 text-sm">
                                    <RotateCcw size={15} /> Reconcile Returns
                                </button>
                                <button onClick={handleCancel} disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 rounded hover:bg-red-50 text-sm">
                                    <XCircle size={15} /> Cancel
                                </button>
                            </>
                        )}
                        {consignment.status === 'RECONCILING' && (
                            <>
                                <button onClick={() => setShowReconcileModal(true)} disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded hover:bg-amber-600 disabled:opacity-50 text-sm">
                                    <RotateCcw size={15} /> Continue Reconciling
                                </button>
                                <button onClick={handleClose} disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 disabled:opacity-50 text-sm">
                                    <CheckCircle size={15} /> Force Close
                                </button>
                            </>
                        )}
                        {consignment.status === 'CLOSED' && (
                            <span className="text-emerald-600 flex items-center gap-2 text-sm"><CheckCircle size={15} /> Consignment closed</span>
                        )}
                        {consignment.status === 'CANCELLED' && (
                            <span className="text-red-500 flex items-center gap-2 text-sm"><XCircle size={15} /> Consignment cancelled</span>
                        )}
                    </div>

                    {/* Items Table */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                            <Package size={18} className="text-gray-400" />
                            <h2 className="font-semibold text-gray-900 text-sm">Items ({consignment.items.length})</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
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
                                <tbody className="divide-y divide-gray-100">
                                    {consignment.items.map((item, index) => {
                                        const pending = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="text-gray-900 text-sm">{item.product_name}</div>
                                                    {item.variant_label && <div className="text-gray-400 text-xs">{item.variant_label}</div>}
                                                </td>
                                                <td className="p-3 text-center text-gray-900 text-sm">{item.quantity_sent}</td>
                                                <td className="p-3 text-center text-emerald-600 text-sm">{item.quantity_sold || '-'}</td>
                                                <td className="p-3 text-center text-blue-600 text-sm">{item.quantity_returned || '-'}</td>
                                                <td className="p-3 text-center text-red-500 text-sm">{item.quantity_lost || '-'}</td>
                                                <td className="p-3 text-center text-sm">
                                                    {pending > 0 ? (
                                                        <span className="text-amber-600 font-bold">{pending}</span>
                                                    ) : (
                                                        <span className="text-emerald-600">✓</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right text-blue-600 font-mono text-sm">
                                                    {formatCurrency(item.quantity_sent * item.unit_price)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-5">
                    {/* Summary */}
                    <div className="bg-white border border-blue-200 rounded-lg p-5 shadow-sm">
                        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Summary</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Sent:</span><span className="text-gray-900">{summary.total_sent_qty} pcs</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Sold:</span><span className="text-emerald-600">{summary.total_sold_qty} pcs</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Returned:</span><span className="text-blue-600">{summary.total_returned_qty} pcs</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Lost:</span><span className="text-red-500">{summary.total_lost_qty} pcs</span></div>
                            <div className="flex justify-between border-t border-gray-100 pt-2">
                                <span className="text-gray-500">Pending:</span>
                                <span className={summary.total_pending_qty > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                                    {summary.total_pending_qty} pcs
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Financial */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Financial</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Sent Value:</span><span className="text-blue-600 font-mono">{formatCurrency(consignment.total_sent_value)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Sold Value:</span><span className="text-emerald-600 font-mono">{formatCurrency(consignment.total_sold_value)}</span></div>
                            {consignment.commission_rate && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Commission ({consignment.commission_rate}%):</span>
                                    <span className="text-amber-600 font-mono">{formatCurrency(consignment.total_sold_value * (consignment.commission_rate / 100))}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-500">Lost Value:</span><span className="text-red-500 font-mono">{formatCurrency(consignment.total_lost_value)}</span></div>
                        </div>
                    </div>

                    {/* Partner */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2"><Users size={15} className="text-gray-400" /> Partner</h2>
                        <div className="space-y-1 text-sm">
                            <div className="text-gray-900 font-medium">{consignment.partner.name}</div>
                            {consignment.partner.contact_person && <div className="text-gray-500">{consignment.partner.contact_person}</div>}
                            {consignment.partner.phone && <div className="text-gray-500">{consignment.partner.phone}</div>}
                            {consignment.partner.email && <div className="text-gray-500">{consignment.partner.email}</div>}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2"><Calendar size={15} className="text-gray-400" /> Timeline</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Created:</span><span className="text-gray-900">{formatDate(consignment.created_at)}</span></div>
                            {consignment.sent_at && <div className="flex justify-between"><span className="text-gray-500">Sent:</span><span className="text-blue-600">{formatDate(consignment.sent_at)}</span></div>}
                            {consignment.expected_return_date && <div className="flex justify-between"><span className="text-gray-500">Expected Return:</span><span className="text-amber-600">{formatDate(consignment.expected_return_date)}</span></div>}
                            {consignment.closed_at && <div className="flex justify-between"><span className="text-gray-500">Closed:</span><span className="text-emerald-600">{formatDate(consignment.closed_at)}</span></div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales Modal */}
            {showSalesModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-w-xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Record Sales</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {consignment.items.map((item, index) => {
                                const key = `${item.product_id}-${item.variant_sku || ''}`;
                                const available = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
                                return (
                                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                        <div>
                                            <div className="text-gray-900 text-sm font-medium">{item.product_name}</div>
                                            {item.variant_label && <div className="text-gray-400 text-xs">{item.variant_label}</div>}
                                            <div className="text-gray-400 text-xs">Available: {available}</div>
                                        </div>
                                        <input type="number" min={0} max={available}
                                            value={salesData[key] || 0}
                                            onChange={(e) => setSalesData({ ...salesData, [key]: parseInt(e.target.value) || 0 })}
                                            className="w-20 border border-gray-200 rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:border-blue-400" />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => setShowSalesModal(false)}
                                className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300">Cancel</button>
                            <button onClick={handleRecordSales} disabled={processing}
                                className="px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700 disabled:opacity-50 text-sm">
                                {processing ? 'Saving…' : 'Save Sales'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconcile Modal */}
            {showReconcileModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Reconcile Returns</h2>
                            <p className="text-gray-500 text-sm">Specify how many items were returned vs lost</p>
                        </div>
                        <div className="p-4 space-y-3">
                            {consignment.items.map((item, index) => {
                                const key = `${item.product_id}-${item.variant_sku || ''}`;
                                const pending = item.quantity_sent - item.quantity_sold - item.quantity_returned - item.quantity_lost;
                                if (pending <= 0) return null;
                                return (
                                    <div key={index} className="p-4 bg-gray-50 border border-gray-100 rounded">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="text-gray-900 text-sm font-medium">{item.product_name}</div>
                                                {item.variant_label && <div className="text-gray-400 text-xs">{item.variant_label}</div>}
                                            </div>
                                            <div className="text-amber-600 font-bold text-sm">{pending} pending</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-gray-500 text-xs block mb-1">Returned (good)</label>
                                                <input type="number" min={0} max={pending}
                                                    value={reconcileData[key]?.returned || 0}
                                                    onChange={(e) => setReconcileData({ ...reconcileData, [key]: { ...reconcileData[key], returned: parseInt(e.target.value) || 0 } })}
                                                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:border-blue-400" />
                                            </div>
                                            <div>
                                                <label className="text-red-500 text-xs block mb-1">Lost/Damaged</label>
                                                <input type="number" min={0} max={pending}
                                                    value={reconcileData[key]?.lost || 0}
                                                    onChange={(e) => setReconcileData({ ...reconcileData, [key]: { ...reconcileData[key], lost: parseInt(e.target.value) || 0 } })}
                                                    className="w-full border border-red-200 rounded px-2 py-1.5 text-center text-sm focus:outline-none focus:border-red-400" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                            <button onClick={() => setShowReconcileModal(false)}
                                className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300">Cancel</button>
                            <button onClick={handleReconcile} disabled={processing}
                                className="px-4 py-2 bg-amber-500 text-white font-medium rounded hover:bg-amber-600 disabled:opacity-50 text-sm">
                                {processing ? 'Processing…' : 'Confirm Reconciliation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
