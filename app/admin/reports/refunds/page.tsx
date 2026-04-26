'use client';

import { useState, useEffect, useMemo } from 'react';
import { getOrders, OrderSummary } from '@/actions/order-admin-actions';
import { RotateCcw, Download, TrendingDown } from 'lucide-react';
import Link from 'next/link';

function defaultRange() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function exportCsv(orders: OrderSummary[], dateFrom: string, dateTo: string) {
    const rows = [
        `Rud'Ark Refunds & Cancellations — ${dateFrom} to ${dateTo}`,
        '',
        'Order ID,Date,Customer,Email,Status,Amount (RM)',
        ...orders.map(o => [
            o.id,
            o.created_at ? new Date(o.created_at).toLocaleDateString('en-MY') : '',
            `"${o.customer_name}"`,
            o.customer_email,
            o.status,
            o.total_amount.toFixed(2),
        ].join(',')),
        '',
        `Total Count,${orders.length}`,
        `Total Amount,${orders.reduce((s, o) => s + o.total_amount, 0).toFixed(2)}`,
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `refunds-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

const STATUS_COLORS: Record<string, string> = {
    REFUNDED: 'bg-orange-50 text-orange-700 border-orange-100',
    CANCELLED: 'bg-red-50 text-red-700 border-red-100',
    PAYMENT_FAILED: 'bg-gray-100 text-gray-600 border-gray-200',
    EXPIRED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function RefundsReportPage() {
    const range = defaultRange();
    const [dateFrom, setDateFrom] = useState(range.from);
    const [dateTo, setDateTo] = useState(range.to);
    const [allOrders, setAllOrders] = useState<OrderSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const { orders: data } = await getOrders({ dateFrom, dateTo });
            setAllOrders(data);
            setLoading(false);
        })();
    }, [dateFrom, dateTo]);

    const refunded = useMemo(() =>
        allOrders.filter(o => ['REFUNDED', 'CANCELLED', 'PAYMENT_FAILED', 'EXPIRED'].includes((o.status || '').toUpperCase())),
        [allOrders]
    );

    const paidOrders = allOrders.filter(o => ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'READY_TO_SHIP'].includes((o.status || '').toUpperCase()));
    const totalRefunded = refunded.filter(o => o.status === 'REFUNDED').reduce((s, o) => s + o.total_amount, 0);
    const cancellations = refunded.filter(o => o.status === 'CANCELLED').length;
    const refundRate = allOrders.length > 0 ? (refunded.length / allOrders.length) * 100 : 0;

    return (
        <div className="max-w-5xl pb-20">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <RotateCcw size={20} className="text-orange-500" /> Refunds & Cancellations
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">REFUNDED, CANCELLED, FAILED, and EXPIRED orders</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="date" value={dateFrom} max={dateTo}
                        onChange={e => setDateFrom(e.target.value)}
                        className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    <span className="text-gray-400 text-sm">to</span>
                    <input type="date" value={dateTo} min={dateFrom}
                        onChange={e => setDateTo(e.target.value)}
                        className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    {[{ label: '7d', days: 6 }, { label: '30d', days: 29 }, { label: '90d', days: 89 }].map(({ label, days }) => (
                        <button key={label} onClick={() => {
                            const t = new Date(); const f = new Date(); f.setDate(f.getDate() - days);
                            setDateFrom(f.toISOString().slice(0, 10)); setDateTo(t.toISOString().slice(0, 10));
                        }} className="px-3 py-2 text-xs border border-gray-200 rounded hover:border-blue-400 hover:text-blue-600 transition-colors">{label}</button>
                    ))}
                    <button
                        onClick={() => exportCsv(refunded, dateFrom, dateTo)}
                        disabled={refunded.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-orange-500">{refunded.filter(o => o.status === 'REFUNDED').length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Refunded Orders</p>
                    <p className="text-xs text-gray-400 mt-0.5">RM {totalRefunded.toFixed(2)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-red-500">{cancellations}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cancellations</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-gray-700">{refundRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-0.5">Refund / Cancel Rate</p>
                    <p className="text-xs text-gray-400 mt-0.5">{allOrders.length} total orders</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="text-2xl font-bold text-emerald-600">{paidOrders.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Successful Orders</p>
                    <p className="text-xs text-gray-400 mt-0.5">RM {paidOrders.reduce((s, o) => s + o.total_amount, 0).toFixed(2)} revenue</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">
                        {refunded.length} records
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-left">Order</th>
                                    <th className="px-4 py-2.5 text-left">Customer</th>
                                    <th className="px-4 py-2.5 text-left">Status</th>
                                    <th className="px-4 py-2.5 text-right">Amount</th>
                                    <th className="px-4 py-2.5 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {refunded.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No refunds or cancellations in this period</td></tr>
                                ) : refunded.map(o => (
                                    <tr key={o.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-blue-600 hover:underline">{o.id}</Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 text-xs">{o.customer_name}</p>
                                            <p className="text-[10px] text-gray-400">{o.customer_email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-semibold ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 text-xs">RM {o.total_amount.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right text-gray-400 text-xs">
                                            {o.created_at ? new Date(o.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {refunded.length > 0 && (
                                <tfoot className="bg-gray-50 border-t border-gray-200 text-sm font-semibold">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-2 text-gray-700">{refunded.length} records</td>
                                        <td className="px-4 py-2 text-right text-orange-600">
                                            RM {refunded.reduce((s, o) => s + o.total_amount, 0).toFixed(2)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
