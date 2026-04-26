'use client';

import { useState, useEffect, useCallback } from 'react';
import { getReportsData, ReportsData } from '@/actions/reports-actions';
import { BarChart3, Download, TrendingUp, ShoppingCart, Package, XCircle } from 'lucide-react';

function fmt(n: number) {
    return `RM ${n.toFixed(2)}`;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

function defaultRange() {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
    };
}

function exportCsv(data: ReportsData, dateFrom: string, dateTo: string) {
    const rows: string[] = [
        `Rud'Ark Sales Report — ${dateFrom} to ${dateTo}`,
        '',
        'SUMMARY',
        `Total Orders,${data.summary.totalOrders}`,
        `Total Revenue,${data.summary.totalRevenue.toFixed(2)}`,
        `Avg Order Value,${data.summary.avgOrderValue.toFixed(2)}`,
        `Completed Orders,${data.summary.completedOrders}`,
        `Cancelled Orders,${data.summary.cancelledOrders}`,
        `Completion Rate,${data.summary.completionRate.toFixed(1)}%`,
        '',
        'DAILY BREAKDOWN',
        'Date,Orders,Revenue,Completed,Cancelled',
        ...data.daily.map(d => `${d.date},${d.orders},${d.revenue.toFixed(2)},${d.completed},${d.cancelled}`),
        '',
        'TOP PRODUCTS',
        'Product,SKU,Units Sold,Revenue',
        ...data.topProducts.map(p => `"${p.name}",${p.sku},${p.qty},${p.revenue.toFixed(2)}`),
        '',
        'STATUS BREAKDOWN',
        'Status,Count',
        ...Object.entries(data.statusBreakdown).map(([s, c]) => `${s},${c}`),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rudark-report-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ReportsPage() {
    const range = defaultRange();
    const [dateFrom, setDateFrom] = useState(range.from);
    const [dateTo, setDateTo] = useState(range.to);
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const result = await getReportsData(dateFrom, dateTo);
        setData(result);
        setLoading(false);
    }, [dateFrom, dateTo]);

    useEffect(() => { load(); }, [load]);

    const maxRevenue = data ? Math.max(...data.daily.map(d => d.revenue), 1) : 1;

    return (
        <div className="max-w-5xl pb-20">
            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-600" /> Sales Reports
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Revenue and order analytics</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="date" value={dateFrom} max={dateTo}
                        onChange={e => setDateFrom(e.target.value)}
                        className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    <span className="text-gray-400 text-sm">to</span>
                    <input type="date" value={dateTo} min={dateFrom}
                        onChange={e => setDateTo(e.target.value)}
                        className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    {/* Quick presets */}
                    {[
                        { label: '7d', days: 6 },
                        { label: '30d', days: 29 },
                        { label: '90d', days: 89 },
                    ].map(({ label, days }) => (
                        <button key={label} onClick={() => {
                            const t = new Date();
                            const f = new Date();
                            f.setDate(f.getDate() - days);
                            setDateFrom(f.toISOString().slice(0, 10));
                            setDateTo(t.toISOString().slice(0, 10));
                        }} className="px-3 py-2 text-xs border border-gray-200 rounded hover:border-blue-400 hover:text-blue-600 transition-colors">
                            {label}
                        </button>
                    ))}
                    <button
                        onClick={() => data && exportCsv(data, dateFrom, dateTo)}
                        disabled={!data || loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center py-20 text-gray-400 text-sm">Loading report…</div>
            )}

            {!loading && data && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <SummaryCard icon={<TrendingUp size={18} className="text-blue-600" />}
                            label="Total Revenue" value={fmt(data.summary.totalRevenue)} sub={`${data.summary.totalOrders} orders`} />
                        <SummaryCard icon={<ShoppingCart size={18} className="text-emerald-600" />}
                            label="Avg Order Value" value={fmt(data.summary.avgOrderValue)} sub="per order" />
                        <SummaryCard icon={<Package size={18} className="text-violet-600" />}
                            label="Completed" value={String(data.summary.completedOrders)}
                            sub={`${data.summary.completionRate.toFixed(0)}% rate`} />
                        <SummaryCard icon={<XCircle size={18} className="text-red-500" />}
                            label="Cancelled" value={String(data.summary.cancelledOrders)} sub="orders" />
                    </div>

                    {/* Daily revenue chart (bar) */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Revenue</h2>
                        {data.daily.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">No orders in this range</p>
                        ) : (
                            <div className="flex items-end gap-1 h-36 overflow-x-auto pb-2">
                                {data.daily.map(d => (
                                    <div key={d.date} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 28 }}>
                                        <div
                                            className="w-5 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                                            style={{ height: `${(d.revenue / maxRevenue) * 120}px`, minHeight: d.orders > 0 ? 3 : 0 }}
                                            title={`${fmtDate(d.date)}: ${fmt(d.revenue)} (${d.orders} orders)`}
                                        />
                                        {data.daily.length <= 14 && (
                                            <span className="text-[9px] text-gray-400 mt-1 rotate-45 origin-left">{fmtDate(d.date)}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {/* Status breakdown */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Order Status</h2>
                            <div className="space-y-2">
                                {Object.entries(data.statusBreakdown)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([status, count]) => (
                                        <div key={status} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">{status}</span>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 rounded-full bg-blue-100 w-24 overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${(count / data.summary.totalOrders) * 100}%` }} />
                                                </div>
                                                <span className="text-gray-900 font-medium w-8 text-right">{count}</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Top products */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Top Products by Units Sold</h2>
                            <div className="space-y-2">
                                {data.topProducts.slice(0, 8).map((p, i) => (
                                    <div key={p.sku || i} className="flex items-center justify-between text-sm">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <p className="text-gray-800 truncate">{p.name}</p>
                                            {p.sku && <p className="text-[10px] text-gray-400">{p.sku}</p>}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-semibold text-gray-900">{p.qty} units</span>
                                            <p className="text-[10px] text-gray-400">{fmt(p.revenue)}</p>
                                        </div>
                                    </div>
                                ))}
                                {data.topProducts.length === 0 && (
                                    <p className="text-gray-400 text-sm text-center py-4">No sales data</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Daily table */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-700">Daily Breakdown</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Date</th>
                                        <th className="px-4 py-2 text-right">Orders</th>
                                        <th className="px-4 py-2 text-right">Revenue</th>
                                        <th className="px-4 py-2 text-right">Completed</th>
                                        <th className="px-4 py-2 text-right">Cancelled</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.daily.map(d => (
                                        <tr key={d.date} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-gray-700">{fmtDate(d.date)}</td>
                                            <td className="px-4 py-2 text-right text-gray-900">{d.orders}</td>
                                            <td className="px-4 py-2 text-right text-gray-900 font-medium">{fmt(d.revenue)}</td>
                                            <td className="px-4 py-2 text-right text-emerald-600">{d.completed}</td>
                                            <td className="px-4 py-2 text-right text-red-500">{d.cancelled}</td>
                                        </tr>
                                    ))}
                                    {data.daily.length === 0 && (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No orders in this period</td></tr>
                                    )}
                                </tbody>
                                {data.daily.length > 0 && (
                                    <tfoot className="bg-gray-50 font-semibold text-sm border-t border-gray-200">
                                        <tr>
                                            <td className="px-4 py-2 text-gray-700">Total</td>
                                            <td className="px-4 py-2 text-right">{data.summary.totalOrders}</td>
                                            <td className="px-4 py-2 text-right">{fmt(data.summary.totalRevenue)}</td>
                                            <td className="px-4 py-2 text-right text-emerald-600">{data.summary.completedOrders}</td>
                                            <td className="px-4 py-2 text-right text-red-500">{data.summary.cancelledOrders}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function SummaryCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
    );
}
