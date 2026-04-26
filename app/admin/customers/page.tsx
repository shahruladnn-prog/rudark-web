'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getOrders } from '@/actions/order-admin-actions';
import { Users, Search, Mail, Phone, ShoppingBag, TrendingUp, RefreshCw, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface Customer {
    email: string;
    name: string;
    phone: string;
    orderCount: number;
    totalSpend: number;
    lastOrderDate: string;
    statuses: string[];
}

function buildCustomers(orders: any[]): Customer[] {
    const map = new Map<string, Customer>();

    for (const o of orders) {
        const email = (o.customer_email || '').toLowerCase().trim();
        if (!email) continue;

        const isPaid = ['PAID', 'SHIPPED', 'READY_TO_SHIP', 'COMPLETED', 'DELIVERED'].includes(
            (o.status || '').toUpperCase()
        );

        if (!map.has(email)) {
            map.set(email, {
                email,
                name: o.customer_name || 'Unknown',
                phone: o.customer_phone || '',
                orderCount: 0,
                totalSpend: 0,
                lastOrderDate: o.created_at || '',
                statuses: [],
            });
        }

        const c = map.get(email)!;
        c.orderCount++;
        if (isPaid) c.totalSpend += o.total_amount || 0;
        if (!c.statuses.includes(o.status)) c.statuses.push(o.status);
        if (o.created_at > c.lastOrderDate) {
            c.lastOrderDate = o.created_at;
            c.name = o.customer_name || c.name;
            c.phone = o.customer_phone || c.phone;
        }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
}

type SortKey = 'totalSpend' | 'orderCount' | 'lastOrderDate' | 'name';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('totalSpend');
    const [sortAsc, setSortAsc] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { orders } = await getOrders({ pageSize: 500 });
                setCustomers(buildCustomers(orders));
            } catch {
                setCustomers([]);
            }
            setLoading(false);
        })();
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        const list = q
            ? customers.filter(
                c =>
                    c.name.toLowerCase().includes(q) ||
                    c.email.includes(q) ||
                    c.phone.includes(q)
            )
            : customers;

        return [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortKey === 'orderCount') cmp = a.orderCount - b.orderCount;
            else if (sortKey === 'totalSpend') cmp = a.totalSpend - b.totalSpend;
            else if (sortKey === 'lastOrderDate') cmp = a.lastOrderDate.localeCompare(b.lastOrderDate);
            return sortAsc ? cmp : -cmp;
        });
    }, [customers, search, sortKey, sortAsc]);

    const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0);
    const repeatBuyers = customers.filter(c => c.orderCount > 1).length;

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(a => !a);
        else { setSortKey(key); setSortAsc(false); }
    };

    const SortIcon = ({ k }: { k: SortKey }) =>
        sortKey === k
            ? sortAsc ? <ChevronUp size={13} className="inline ml-0.5" /> : <ChevronDown size={13} className="inline ml-0.5" />
            : null;

    return (
        <div className="max-w-6xl pb-20">
            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users size={20} className="text-blue-600" /> Customers
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">Derived from order history</p>
                </div>
                <button
                    onClick={() => { setLoading(true); getOrders({ pageSize: 500 }).then(({ orders }) => { setCustomers(buildCustomers(orders)); setLoading(false); }); }}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 rounded text-sm disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Customers</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">RM {totalRevenue.toFixed(0)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Revenue</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-emerald-600">{repeatBuyers}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Repeat Buyers</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="text-2xl font-bold text-violet-600">
                        RM {customers.length > 0 ? (totalRevenue / customers.length).toFixed(0) : '0'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Avg Lifetime Value</div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 shadow-sm">
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, email or phone…"
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-20 text-gray-400 text-sm">Loading customers…</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                                <tr>
                                    <th
                                        className="px-4 py-3 text-left cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('name')}
                                    >
                                        Customer <SortIcon k="name" />
                                    </th>
                                    <th className="px-4 py-3 text-left">Contact</th>
                                    <th
                                        className="px-4 py-3 text-right cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('orderCount')}
                                    >
                                        Orders <SortIcon k="orderCount" />
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('totalSpend')}
                                    >
                                        Total Spend <SortIcon k="totalSpend" />
                                    </th>
                                    <th
                                        className="px-4 py-3 text-right cursor-pointer hover:text-gray-700 select-none"
                                        onClick={() => toggleSort('lastOrderDate')}
                                    >
                                        Last Order <SortIcon k="lastOrderDate" />
                                    </th>
                                    <th className="px-4 py-3 text-right">History</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                            {search ? 'No customers match your search' : 'No customer data yet'}
                                        </td>
                                    </tr>
                                )}
                                {filtered.map(c => (
                                    <tr key={c.email} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
                                                    {c.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{c.name}</p>
                                                    {c.orderCount > 1 && (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-medium">
                                                            Repeat buyer
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-0.5">
                                                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 text-xs">
                                                    <Mail size={11} /> {c.email}
                                                </a>
                                                {c.phone && (
                                                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 text-xs">
                                                        <Phone size={11} /> {c.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="flex items-center justify-end gap-1 text-gray-900 font-medium">
                                                <ShoppingBag size={13} className="text-gray-400" />
                                                {c.orderCount}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="flex items-center justify-end gap-1 font-semibold text-gray-900">
                                                <TrendingUp size={13} className="text-emerald-500" />
                                                RM {c.totalSpend.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                            {c.lastOrderDate
                                                ? new Date(c.lastOrderDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/admin/orders?q=${encodeURIComponent(c.email)}`}
                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                Orders <ArrowRight size={11} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {filtered.length > 0 && (
                                <tfoot className="bg-gray-50 border-t border-gray-200 text-sm font-semibold">
                                    <tr>
                                        <td className="px-4 py-2 text-gray-700" colSpan={2}>{filtered.length} customers</td>
                                        <td className="px-4 py-2 text-right text-gray-700">
                                            {filtered.reduce((s, c) => s + c.orderCount, 0)} orders
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-700">
                                            RM {filtered.reduce((s, c) => s + c.totalSpend, 0).toFixed(2)}
                                        </td>
                                        <td colSpan={2} />
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
