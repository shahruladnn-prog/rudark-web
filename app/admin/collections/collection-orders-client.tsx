'use client';

import { useState } from 'react';
import { markAsCollected } from '@/actions/collection-orders-actions';
import { Package, MapPin, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    collection_point_name: string;
    collection_point_address: string;
    collection_fee: number;
    total_amount: number;
    shipping_status: string;
    created_at: string;
    items: any[];
}

interface Stats {
    total: number;
    ready: number;
    collected: number;
    totalRevenue: number;
}

export default function CollectionOrdersClient({
    initialOrders,
    initialStats
}: {
    initialOrders: Order[];
    initialStats: Stats;
}) {
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [stats, setStats] = useState<Stats>(initialStats);
    const [filter, setFilter] = useState<'all' | 'READY_FOR_COLLECTION' | 'COLLECTED'>('all');
    const [loading, setLoading] = useState<string | null>(null);

    const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.shipping_status === filter);

    const handleMarkCollected = async (orderId: string) => {
        setLoading(orderId);
        const result = await markAsCollected(orderId);
        if (result.success) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, shipping_status: 'COLLECTED' } : o));
            setStats({ ...stats, ready: stats.ready - 1, collected: stats.collected + 1 });
        }
        setLoading(null);
    };

    return (
        <div className="max-w-6xl pb-20 space-y-5">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Collection Monitor</h1>
                <p className="text-sm text-gray-400">Track and manage self-collection orders</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-3">
                    <Package className="text-gray-400" size={22} />
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                        <div className="text-xs text-gray-400 uppercase">Total Orders</div>
                    </div>
                </div>
                <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm flex items-center gap-3">
                    <Clock className="text-amber-500" size={22} />
                    <div>
                        <div className="text-2xl font-bold text-amber-600">{stats.ready}</div>
                        <div className="text-xs text-gray-400 uppercase">Ready for Pickup</div>
                    </div>
                </div>
                <div className="bg-white border border-emerald-200 rounded-lg p-4 shadow-sm flex items-center gap-3">
                    <CheckCircle className="text-emerald-500" size={22} />
                    <div>
                        <div className="text-2xl font-bold text-emerald-600">{stats.collected}</div>
                        <div className="text-xs text-gray-400 uppercase">Collected</div>
                    </div>
                </div>
                <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm flex items-center gap-3">
                    <TrendingUp className="text-blue-500" size={22} />
                    <div>
                        <div className="text-2xl font-bold text-blue-600">RM {stats.totalRevenue.toFixed(2)}</div>
                        <div className="text-xs text-gray-400 uppercase">Total Revenue</div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    All ({orders.length})
                </button>
                <button onClick={() => setFilter('READY_FOR_COLLECTION')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === 'READY_FOR_COLLECTION' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Ready ({stats.ready})
                </button>
                <button onClick={() => setFilter('COLLECTED')}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filter === 'COLLECTED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    Collected ({stats.collected})
                </button>
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="p-4 font-medium border-b border-gray-100">Order #</th>
                                <th className="p-4 font-medium border-b border-gray-100">Customer</th>
                                <th className="p-4 font-medium border-b border-gray-100">Collection Point</th>
                                <th className="p-4 font-medium border-b border-gray-100">Items</th>
                                <th className="p-4 font-medium border-b border-gray-100">Total</th>
                                <th className="p-4 font-medium border-b border-gray-100">Status</th>
                                <th className="p-4 font-medium border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-400 text-sm">No orders found</td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono text-blue-600 text-sm font-medium">{order.order_number}</div>
                                            <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 text-sm">{order.customer_name}</div>
                                            <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                            <div className="text-xs text-gray-400">{order.customer_email}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-start gap-1.5">
                                                <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">{order.collection_point_name}</div>
                                                    <div className="text-xs text-gray-400">{order.collection_point_address}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-700 text-sm">{order.items?.length || 0} items</td>
                                        <td className="p-4">
                                            <div className="font-mono text-gray-900 font-semibold text-sm">RM {order.total_amount.toFixed(2)}</div>
                                            <div className="text-xs text-gray-400">Fee: RM {order.collection_fee.toFixed(2)}</div>
                                        </td>
                                        <td className="p-4">
                                            {order.shipping_status === 'READY_FOR_COLLECTION' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                                                    <Clock size={11} /> Ready
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                    <CheckCircle size={11} /> Collected
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {order.shipping_status === 'READY_FOR_COLLECTION' && (
                                                <button onClick={() => handleMarkCollected(order.id)}
                                                    disabled={loading === order.id}
                                                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 disabled:opacity-50">
                                                    {loading === order.id ? 'Updating…' : 'Mark Collected'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
