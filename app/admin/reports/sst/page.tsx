'use client';

import { useState, useEffect, useMemo } from 'react';
import { getReportsData, ReportsData } from '@/actions/reports-actions';
import { Receipt, Download } from 'lucide-react';

const SST_RATES = [
    { label: '10% (Goods)', value: 10 },
    { label: '8% (Goods — reduced)', value: 8 },
    { label: '6% (Services)', value: 6 },
    { label: 'Custom', value: 0 },
];

function defaultRange() {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function exportCsv(data: ReportsData, sstRate: number, dateFrom: string, dateTo: string) {
    const taxMultiplier = sstRate / 100;
    const rows = [
        `Rud'Ark SST Report — ${dateFrom} to ${dateTo} (${sstRate}% rate)`,
        '',
        'Date,Total Revenue (incl. SST),SST Amount,Revenue ex. SST,Orders',
        ...data.daily.map(d => {
            const sst = d.revenue * taxMultiplier;
            const exSST = d.revenue - sst;
            return `${d.date},${d.revenue.toFixed(2)},${sst.toFixed(2)},${exSST.toFixed(2)},${d.orders}`;
        }),
        '',
        `TOTAL,${data.summary.totalRevenue.toFixed(2)},${(data.summary.totalRevenue * taxMultiplier).toFixed(2)},${(data.summary.totalRevenue * (1 - taxMultiplier)).toFixed(2)},${data.summary.totalOrders}`,
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sst-report-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function SSTReportPage() {
    const range = defaultRange();
    const [dateFrom, setDateFrom] = useState(range.from);
    const [dateTo, setDateTo] = useState(range.to);
    const [data, setData] = useState<ReportsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sstRate, setSstRate] = useState(10);
    const [customRate, setCustomRate] = useState('10');
    const [useCustom, setUseCustom] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const d = await getReportsData(dateFrom, dateTo);
            setData(d);
            setLoading(false);
        })();
    }, [dateFrom, dateTo]);

    const effectiveRate = useCustom ? (parseFloat(customRate) || 0) : sstRate;
    const taxMultiplier = effectiveRate / 100;

    const summary = useMemo(() => {
        if (!data) return null;
        const totalRevenue = data.summary.totalRevenue;
        const sstAmount = totalRevenue * taxMultiplier;
        const revenueExSST = totalRevenue - sstAmount;
        return { totalRevenue, sstAmount, revenueExSST };
    }, [data, taxMultiplier]);

    return (
        <div className="max-w-5xl pb-20">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Receipt size={20} className="text-blue-600" /> SST / Tax Report
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Malaysian Sales & Service Tax estimation</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="date" value={dateFrom} max={dateTo}
                        onChange={e => setDateFrom(e.target.value)}
                        className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    <span className="text-gray-400 text-sm">to</span>
                    <input type="date" value={dateTo} min={dateFrom}
                        onChange={e => setDateTo(e.target.value)}
                        className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                    <button
                        onClick={() => data && exportCsv(data, effectiveRate, dateFrom, dateTo)}
                        disabled={!data || loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-40"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* SST Rate Selector */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">SST Rate</p>
                <div className="flex flex-wrap gap-2 items-center">
                    {SST_RATES.map(r => (
                        <button
                            key={r.label}
                            onClick={() => {
                                if (r.value === 0) { setUseCustom(true); }
                                else { setUseCustom(false); setSstRate(r.value); }
                            }}
                            className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors ${
                                (r.value > 0 && !useCustom && sstRate === r.value) || (r.value === 0 && useCustom)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-gray-200 text-gray-600 hover:border-blue-400'
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                    {useCustom && (
                        <div className="flex items-center gap-1">
                            <input
                                type="number" min="0" max="100" step="0.1"
                                value={customRate}
                                onChange={e => setCustomRate(e.target.value)}
                                className="w-20 border border-blue-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-500">%</span>
                        </div>
                    )}
                    <span className="text-xs text-gray-400 ml-2">Effective rate: <strong>{effectiveRate}%</strong></span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Note: This is an estimation tool. Consult your accountant for official SST filing.
                    Revenue figures include shipping costs.
                </p>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
            ) : !data || !summary ? null : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <p className="text-xs text-gray-500 font-medium mb-1">Gross Revenue (incl. SST)</p>
                            <p className="text-3xl font-bold text-gray-900">RM {summary.totalRevenue.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">{data.summary.totalOrders} paid orders</p>
                        </div>
                        <div className="bg-white border border-blue-100 rounded-lg p-5 shadow-sm">
                            <p className="text-xs text-blue-600 font-medium mb-1">Est. SST Output Tax ({effectiveRate}%)</p>
                            <p className="text-3xl font-bold text-blue-600">RM {summary.sstAmount.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">Collected from customers</p>
                        </div>
                        <div className="bg-white border border-emerald-100 rounded-lg p-5 shadow-sm">
                            <p className="text-xs text-emerald-600 font-medium mb-1">Revenue ex. SST</p>
                            <p className="text-3xl font-bold text-emerald-600">RM {summary.revenueExSST.toFixed(2)}</p>
                            <p className="text-xs text-gray-400 mt-1">Net of SST obligation</p>
                        </div>
                    </div>

                    {/* Daily breakdown */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-700">Daily SST Breakdown</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left">Date</th>
                                        <th className="px-4 py-2.5 text-right">Orders</th>
                                        <th className="px-4 py-2.5 text-right">Revenue (incl. SST)</th>
                                        <th className="px-4 py-2.5 text-right">SST ({effectiveRate}%)</th>
                                        <th className="px-4 py-2.5 text-right">Revenue ex. SST</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.daily.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No orders in this period</td></tr>
                                    ) : data.daily.map(d => {
                                        const sst = d.revenue * taxMultiplier;
                                        return (
                                            <tr key={d.date} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5 text-gray-700">
                                                    {new Date(d.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-gray-600">{d.orders}</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-gray-900">RM {d.revenue.toFixed(2)}</td>
                                                <td className="px-4 py-2.5 text-right text-blue-600">RM {sst.toFixed(2)}</td>
                                                <td className="px-4 py-2.5 text-right text-emerald-600">RM {(d.revenue - sst).toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {data.daily.length > 0 && (
                                    <tfoot className="bg-gray-50 font-semibold text-sm border-t border-gray-200">
                                        <tr>
                                            <td className="px-4 py-2.5 text-gray-700">Total</td>
                                            <td className="px-4 py-2.5 text-right">{data.summary.totalOrders}</td>
                                            <td className="px-4 py-2.5 text-right">RM {summary.totalRevenue.toFixed(2)}</td>
                                            <td className="px-4 py-2.5 text-right text-blue-600">RM {summary.sstAmount.toFixed(2)}</td>
                                            <td className="px-4 py-2.5 text-right text-emerald-600">RM {summary.revenueExSST.toFixed(2)}</td>
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
