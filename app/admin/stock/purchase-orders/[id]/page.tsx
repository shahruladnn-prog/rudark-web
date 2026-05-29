'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Package, RefreshCw, XCircle } from 'lucide-react';
import {
    getPurchaseOrder, updatePurchaseOrderStatus, receivePurchaseOrderItems,
    PurchaseOrder, POStatus
} from '@/actions/purchase-order-actions';
import { useToast } from '@/components/ui/toast';

const STATUS_CONFIG: Record<POStatus, { label: string; color: string }> = {
    DRAFT:              { label: 'Draft',     color: 'bg-gray-100 text-gray-600' },
    ORDERED:            { label: 'Ordered',   color: 'bg-blue-100 text-blue-700' },
    PARTIALLY_RECEIVED: { label: 'Partial',   color: 'bg-amber-100 text-amber-700' },
    RECEIVED:           { label: 'Received',  color: 'bg-emerald-100 text-emerald-700' },
    CANCELLED:          { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
};

export default function PurchaseOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [receiveQtys, setReceiveQtys] = useState<Record<number, number>>({});

    const loadPO = async () => {
        setLoading(true);
        const data = await getPurchaseOrder(id);
        setPo(data);
        setLoading(false);
    };

    useEffect(() => { loadPO(); }, [id]);

    const handleStatusChange = async (status: POStatus) => {
        setSubmitting(true);
        const res = await updatePurchaseOrderStatus(id, status);
        if (res.success) {
            showToast('success', `Status updated to ${STATUS_CONFIG[status].label}`);
            loadPO();
        } else {
            showToast('error', res.error || 'Failed to update status');
        }
        setSubmitting(false);
    };

    const handleReceive = async () => {
        const rows = Object.entries(receiveQtys)
            .map(([idx, qty]) => ({ item_index: parseInt(idx), qty_receiving: qty }))
            .filter(r => r.qty_receiving > 0);

        if (rows.length === 0) { showToast('error', 'Enter at least one quantity to receive'); return; }

        setSubmitting(true);
        const res = await receivePurchaseOrderItems(id, rows);
        if (res.success) {
            showToast('success', `Stock received and inventory updated`);
            setReceiveQtys({});
            loadPO();
        } else {
            showToast('error', res.error || 'Failed to receive items');
        }
        setSubmitting(false);
    };

    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>;
    if (!po) return <div className="text-center py-20 text-gray-400 text-sm">Purchase order not found.</div>;

    const cfg = STATUS_CONFIG[po.status];
    const canReceive = po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED';
    const totalOrdered = po.items.reduce((s, i) => s + i.ordered_qty, 0);
    const totalReceived = po.items.reduce((s, i) => s + (i.received_qty || 0), 0);

    return (
        <div className="max-w-4xl pb-20">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/stock/purchase-orders" className="p-2 text-gray-400 hover:text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-900 font-mono">{po.reference}</h1>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">Supplier: {po.supplier_name}</p>
                    </div>
                </div>
                {/* Status actions */}
                <div className="flex gap-2">
                    {po.status === 'DRAFT' && (
                        <button onClick={() => handleStatusChange('ORDERED')} disabled={submitting}
                            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                            <Package size={14} /> Mark Ordered
                        </button>
                    )}
                    {po.status !== 'CANCELLED' && po.status !== 'RECEIVED' && (
                        <button onClick={() => handleStatusChange('CANCELLED')} disabled={submitting}
                            className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-2 rounded text-sm hover:bg-red-50 disabled:opacity-50">
                            <XCircle size={14} /> Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Info bar */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Expected Date', value: po.expected_date ? fmtDate(po.expected_date) : '—' },
                    { label: 'Progress', value: `${totalReceived} / ${totalOrdered} units received` },
                    { label: 'Created', value: fmtDate(po.created_at) },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="text-xs text-gray-400 uppercase font-medium">{label}</div>
                        <div className="text-sm font-semibold text-gray-800 mt-1">{value}</div>
                    </div>
                ))}
            </div>

            {po.notes && (
                <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                    📝 {po.notes}
                </div>
            )}

            {/* Progress bar */}
            {totalOrdered > 0 && (
                <div className="mb-5">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Receiving progress</span>
                        <span>{Math.round((totalReceived / totalOrdered) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (totalReceived / totalOrdered) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Items table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-5">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                            <th className="text-left px-5 py-3">Product / Variant</th>
                            <th className="text-center px-4 py-3">Ordered</th>
                            <th className="text-center px-4 py-3">Received</th>
                            <th className="text-center px-4 py-3">Remaining</th>
                            {canReceive && <th className="text-center px-4 py-3 text-blue-600">Receive Now</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {po.items.map((item, i) => {
                            const remaining = item.ordered_qty - (item.received_qty || 0);
                            const isComplete = remaining <= 0;
                            return (
                                <tr key={i} className={isComplete ? 'bg-emerald-50/30' : ''}>
                                    <td className="px-5 py-3">
                                        <div className="font-medium text-gray-800">{item.product_name}</div>
                                        {item.variant_label && (
                                            <div className="text-xs text-gray-400 mt-0.5">{item.variant_label} · {item.variant_sku}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono text-gray-700">{item.ordered_qty}</td>
                                    <td className="px-4 py-3 text-center font-mono">
                                        <span className={item.received_qty ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                                            {item.received_qty || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center font-mono">
                                        {isComplete ? (
                                            <CheckCircle size={16} className="text-emerald-500 mx-auto" />
                                        ) : (
                                            <span className="text-amber-600 font-semibold">{remaining}</span>
                                        )}
                                    </td>
                                    {canReceive && (
                                        <td className="px-4 py-3 text-center">
                                            {!isComplete ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={remaining}
                                                    value={receiveQtys[i] ?? ''}
                                                    onChange={e => setReceiveQtys(prev => ({
                                                        ...prev,
                                                        [i]: parseInt(e.target.value) || 0
                                                    }))}
                                                    placeholder="0"
                                                    className="w-20 border border-blue-200 rounded px-2 py-1 text-center font-mono text-sm focus:outline-none focus:border-blue-400 bg-blue-50"
                                                />
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Receive button */}
            {canReceive && (
                <div className="flex justify-end">
                    <button
                        onClick={handleReceive}
                        disabled={submitting || Object.values(receiveQtys).every(v => !v || v <= 0)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                    >
                        {submitting ? (
                            <><RefreshCw size={15} className="animate-spin" /> Saving…</>
                        ) : (
                            <><CheckCircle size={15} /> Confirm Receipt & Update Stock</>
                        )}
                    </button>
                </div>
            )}

            {po.status === 'RECEIVED' && (
                <div className="flex items-center gap-2 justify-center py-4 text-emerald-600 font-medium text-sm">
                    <CheckCircle size={18} /> All items received — purchase order complete
                </div>
            )}
        </div>
    );
}
