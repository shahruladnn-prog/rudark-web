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

    const filteredOrders = filter === 'all'
        ? orders
        : orders.filter(o => o.shipping_status === filter);

    const handleMarkCollected = async (orderId: string) => {
        setLoading(orderId);
        const result = await markAsCollected(orderId);

        if (result.success) {
            // Update local state
            setOrders(orders.map(o =>
                o.id === orderId
                    ? { ...o, shipping_status: 'COLLECTED' }
                    : o
            ));
            setStats({
                ...stats,
                ready: stats.ready - 1,
                collected: stats.collected + 1
            });
        }

        setLoading(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Collection <span className="text-rudark-volt">Monitor</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Track and manage self-collection orders
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-rudark-carbon p-4 rounded-sm border border-rudark-grey">
                    <div className="flex items-center gap-3">
                        <Package className="text-gray-400" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-white">{stats.total}</div>
                            <div className="text-xs text-gray-400 uppercase font-mono">Total Orders</div>
                        </div>
                    </div>
                </div>

                <div className="bg-rudark-carbon p-4 rounded-sm border border-yellow-900/50">
                    <div className="flex items-center gap-3">
                        <Clock className="text-yellow-400" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-yellow-400">{stats.ready}</div>
                            <div className="text-xs text-gray-400 uppercase font-mono">Ready for Pickup</div>
                        </div>
                    </div>
                </div>

                <div className="bg-rudark-carbon p-4 rounded-sm border border-green-900/50">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-400" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-green-400">{stats.collected}</div>
                            <div className="text-xs text-gray-400 uppercase font-mono">Collected</div>
                        </div>
                    </div>
                </div>

                <div className="bg-rudark-carbon p-4 rounded-sm border border-rudark-volt/50">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="text-rudark-volt" size={24} />
                        <div>
                            <div className="text-2xl font-bold text-rudark-volt">RM {stats.totalRevenue.toFixed(2)}</div>
                            <div className="text-xs text-gray-400 uppercase font-mono">Total Revenue</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-rudark-carbon p-2 rounded-sm border border-rudark-grey">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-sm font-mono text-sm uppercase transition-colors ${filter === 'all'
                            ? 'bg-rudark-volt text-black font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    All ({orders.length})
                </button>
                <button
                    onClick={() => setFilter('READY_FOR_COLLECTION')}
                    className={`px-4 py-2 rounded-sm font-mono text-sm uppercase transition-colors ${filter === 'READY_FOR_COLLECTION'
                            ? 'bg-yellow-500 text-black font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Ready ({stats.ready})
                </button>
                <button
                    onClick={() => setFilter('COLLECTED')}
                    className={`px-4 py-2 rounded-sm font-mono text-sm uppercase transition-colors ${filter === 'COLLECTED'
                            ? 'bg-green-500 text-black font-bold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Collected ({stats.collected})
                </button>
            </div>

            {/* Orders Table */}
            <div className="rounded-sm border border-rudark-grey overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-rudark-carbon text-gray-400 font-condensed uppercase tracking-wider text-sm">
                        <tr>
                            <th className="p-4 font-bold border-b border-rudark-grey">Order #</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Customer</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Collection Point</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Items</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Total</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Status</th>
                            <th className="p-4 font-bold border-b border-rudark-grey text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-rudark-matte divide-y divide-rudark-grey/30">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-gray-500 font-mono uppercase">
                                    No orders found
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-rudark-carbon/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-mono text-rudark-volt text-sm">{order.order_number}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-white">{order.customer_name}</div>
                                        <div className="text-xs text-gray-400">{order.customer_phone}</div>
                                        <div className="text-xs text-gray-500">{order.customer_email}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-start gap-2">
                                            <MapPin size={16} className="text-rudark-volt mt-0.5" />
                                            <div>
                                                <div className="font-bold text-white text-sm">{order.collection_point_name}</div>
                                                <div className="text-xs text-gray-400">{order.collection_point_address}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-white">{order.items?.length || 0} items</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-mono text-white font-bold">RM {order.total_amount.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500">Fee: RM {order.collection_fee.toFixed(2)}</div>
                                    </td>
                                    <td className="p-4">
                                        {order.shipping_status === 'READY_FOR_COLLECTION' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-bold font-condensed uppercase tracking-wide bg-yellow-900/20 text-yellow-400 border border-yellow-900/50">
                                                <Clock size={12} />
                                                Ready
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-bold font-condensed uppercase tracking-wide bg-green-900/20 text-green-400 border border-green-900/50">
                                                <CheckCircle size={12} />
                                                Collected
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        {order.shipping_status === 'READY_FOR_COLLECTION' && (
                                            <button
                                                onClick={() => handleMarkCollected(order.id)}
                                                disabled={loading === order.id}
                                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-sm hover:bg-green-500 transition-colors disabled:opacity-50 uppercase"
                                            >
                                                {loading === order.id ? 'Updating...' : 'Mark Collected'}
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
    );
}
