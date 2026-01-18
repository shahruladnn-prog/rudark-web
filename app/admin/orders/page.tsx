'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, RefreshCw, Eye, Package, Clock, CheckCircle, Truck, XCircle, ChevronLeft, ChevronRight, ChevronDown, X, MapPin, Phone, Trash2, AlertTriangle, MessageCircle } from 'lucide-react';
import { getOrders, getOrderStats, OrderSummary, updateOrderStatus } from '@/actions/order-admin-actions';
import { cleanupStaleOrders } from '@/actions/order-cleanup';

const STATUS_COLORS: Record<string, string> = {
    'PENDING': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'PENDING_PAYMENT': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    'PAID': 'bg-green-500/20 text-green-400 border-green-500/50',
    'PROCESSING': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'READY_TO_SHIP': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'SHIPPED': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    'DELIVERED': 'bg-green-600/20 text-green-300 border-green-600/50',
    'COMPLETED': 'bg-green-600/20 text-green-300 border-green-600/50',
    'CANCELLED': 'bg-red-500/20 text-red-400 border-red-500/50',
    'REFUNDED': 'bg-red-500/20 text-red-400 border-red-500/50',
    'SHIPMENT_FAILED': 'bg-red-600/20 text-red-500 border-red-600/50 font-bold',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
    'PENDING': Clock,
    'PENDING_PAYMENT': Clock,
    'PAID': CheckCircle,
    'PROCESSING': Package,
    'SHIPPED': Truck,
    'DELIVERED': CheckCircle,
    'COMPLETED': CheckCircle,
    'CANCELLED': XCircle,
    'SHIPMENT_FAILED': AlertTriangle,
};

function getThisWeekRange(): { from: string; to: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        from: monday.toISOString().split('T')[0],
        to: sunday.toISOString().split('T')[0]
    };
}

export default function OrdersPage() {
    const thisWeek = useMemo(() => getThisWeekRange(), []);

    const [allOrders, setAllOrders] = useState<OrderSummary[]>([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, shipped: 0, completed: 0, cancelled: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState(thisWeek.from);
    const [dateTo, setDateTo] = useState(thisWeek.to);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const [ordersData, statsData] = await Promise.all([
                getOrders({ status: statusFilter, search: searchQuery, dateFrom, dateTo, limit: 100 }),
                getOrderStats()
            ]);
            setAllOrders(ordersData);
            setStats(statsData);
            setCurrentPage(1);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadOrders(); }, [statusFilter, dateFrom, dateTo]);

    const handleSearch = () => loadOrders();

    const handleStatusClick = (status: string) => {
        setStatusFilter(status === statusFilter ? 'all' : status);
    };

    const handleQuickDate = (range: 'today' | 'week' | 'month' | 'all') => {
        const now = new Date();
        switch (range) {
            case 'today':
                const today = now.toISOString().split('T')[0];
                setDateFrom(today); setDateTo(today);
                break;
            case 'week':
                const week = getThisWeekRange();
                setDateFrom(week.from); setDateTo(week.to);
                break;
            case 'month':
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                setDateFrom(firstDay.toISOString().split('T')[0]); setDateTo(now.toISOString().split('T')[0]);
                break;
            case 'all':
                setDateFrom(''); setDateTo('');
                break;
        }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string, trackingNumber?: string) => {
        await updateOrderStatus(orderId, newStatus, trackingNumber);
        setSelectedOrder(null);
        loadOrders();
    };

    const totalPages = Math.ceil(allOrders.length / pageSize);
    const paginatedOrders = allOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
    };

    const getStatusColor = (status: string) => STATUS_COLORS[status?.toUpperCase()] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';

    const StatusIcon = ({ status }: { status: string }) => {
        const Icon = STATUS_ICONS[status?.toUpperCase()] || Package;
        return <Icon size={14} />;
    };

    const handleCleanup = async () => {
        if (!confirm('Are you sure you want to delete all PENDING/FAILED orders older than 7 days? This cannot be undone.')) return;

        setLoading(true);
        try {
            const result = await cleanupStaleOrders();
            if (result.success) {
                alert(result.message);
                loadOrders();
            } else {
                alert('Cleanup failed: ' + result.error);
            }
        } catch (e) {
            alert('Error running cleanup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 md:mb-8 md:border-b md:border-rudark-grey md:pb-6">
                <div>
                    <h1 className="text-2xl md:text-4xl font-condensed font-bold text-white uppercase">
                        Order <span className="text-rudark-volt">Management</span>
                    </h1>
                    <p className="text-gray-500 text-xs md:text-sm font-mono hidden md:block">Track and manage orders</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCleanup}
                        className="flex items-center gap-2 px-3 py-2 bg-red-900/50 text-red-400 border border-red-900/50 font-bold rounded-sm text-sm hover:bg-red-900 hover:text-white transition-colors"
                        title="Clean up stale pending orders older than 7 days"
                    >
                        <Trash2 size={16} />
                    </button>
                    <Link
                        href="/admin/orders/ship-scan"
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white font-bold rounded-sm text-sm hover:bg-purple-700"
                    >
                        📦 <span className="hidden md:inline">Scan</span>
                    </Link>
                    <Link
                        href="/admin/orders/delivery-check"
                        className="hidden md:flex items-center gap-2 px-3 py-2 bg-orange-600 text-white font-bold rounded-sm text-sm hover:bg-orange-700"
                    >
                        🚚 <span className="hidden lg:inline">Delivery</span>
                    </Link>
                    <button
                        onClick={loadOrders}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-rudark-volt text-black font-bold rounded-sm text-sm"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden md:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Stats - Simplified on mobile */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 mb-4 md:mb-8">
                <button onClick={() => handleStatusClick('all')} className={`bg-rudark-carbon p-3 md:p-4 border rounded-sm text-left ${statusFilter === 'all' ? 'border-rudark-volt' : 'border-rudark-grey'}`}>
                    <div className="text-xl md:text-3xl font-bold text-white">{stats.total}</div>
                    <div className="text-xs text-gray-400 uppercase">Total</div>
                </button>
                <button onClick={() => handleStatusClick('PAID')} className={`bg-rudark-carbon p-3 md:p-4 border rounded-sm text-left ${statusFilter === 'PAID' ? 'border-green-400' : 'border-green-500/30'}`}>
                    <div className="text-xl md:text-3xl font-bold text-green-400">{stats.paid}</div>
                    <div className="text-xs text-gray-400 uppercase">Paid</div>
                </button>
                <button onClick={() => handleStatusClick('SHIPPED')} className={`bg-rudark-carbon p-3 md:p-4 border rounded-sm text-left ${statusFilter === 'SHIPPED' ? 'border-purple-400' : 'border-purple-500/30'}`}>
                    <div className="text-xl md:text-3xl font-bold text-purple-400">{stats.shipped}</div>
                    <div className="text-xs text-gray-400 uppercase">Shipped</div>
                </button>
                {/* More stats hidden on mobile */}
                <button onClick={() => handleStatusClick('PENDING')} className={`hidden md:block bg-rudark-carbon p-4 border rounded-sm text-left ${statusFilter === 'PENDING' ? 'border-yellow-400' : 'border-yellow-500/30'}`}>
                    <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
                    <div className="text-xs text-gray-400 uppercase">Pending</div>
                </button>
                <button onClick={() => handleStatusClick('COMPLETED')} className={`hidden md:block bg-rudark-carbon p-4 border rounded-sm text-left ${statusFilter === 'COMPLETED' ? 'border-white' : 'border-rudark-grey'}`}>
                    <div className="text-3xl font-bold text-white">{stats.completed}</div>
                    <div className="text-xs text-gray-400 uppercase">Done</div>
                </button>
                <div className="hidden md:block bg-rudark-carbon p-4 border border-rudark-volt rounded-sm">
                    <div className="text-3xl font-bold text-rudark-volt">RM {stats.totalRevenue.toFixed(0)}</div>
                    <div className="text-xs text-gray-400 uppercase">Revenue</div>
                </div>
            </div>

            {/* Search + Quick Filters */}
            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-3 md:p-4 mb-4">
                <div className="flex gap-2 mb-3">
                    <div className="flex-1 flex items-center gap-2 bg-rudark-matte border border-rudark-grey rounded-sm px-3">
                        <Search size={16} className="text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search order..."
                            className="flex-1 bg-transparent text-white text-sm py-2 focus:outline-none"
                        />
                    </div>
                    <button onClick={handleSearch} className="px-4 py-2 bg-rudark-volt text-black font-bold rounded-sm text-sm">
                        Go
                    </button>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                    {['today', 'week', 'month', 'all'].map(range => (
                        <button
                            key={range}
                            onClick={() => handleQuickDate(range as any)}
                            className={`px-3 py-1 text-xs border rounded-sm whitespace-nowrap ${(range === 'week' && dateFrom === thisWeek.from) ? 'border-rudark-volt text-rudark-volt' : 'border-rudark-grey text-gray-400'
                                }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List - Card view for mobile, table for desktop */}
            {isMobile ? (
                // Mobile Card View
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : paginatedOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">No orders found</div>
                    ) : (
                        paginatedOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden"
                            >
                                {/* Card Header - Tappable */}
                                <button
                                    onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                                    className="w-full p-4 text-left"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-white">{order.customer_name}</div>
                                            <div className="text-xs text-gray-500 font-mono">{order.id.slice(0, 12)}...</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-rudark-volt font-bold font-mono">RM {order.total_amount.toFixed(2)}</div>
                                            <div className="text-xs text-gray-500">{formatDate(order.created_at)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                                            <StatusIcon status={order.status} />
                                            {order.status}
                                        </span>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <span className="text-xs">{order.items_count} items</span>
                                            <ChevronDown size={16} className={`transition-transform ${selectedOrder === order.id ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Actions */}
                                {selectedOrder === order.id && (
                                    <div className="border-t border-rudark-grey p-4 bg-rudark-matte/50 space-y-3">
                                        {/* Contact Info */}
                                        <div className="flex gap-4 text-sm">
                                            <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-rudark-volt">
                                                <Phone size={14} />
                                                {order.customer_phone}
                                            </a>
                                            {order.delivery_method === 'self_collection' && (
                                                <span className="flex items-center gap-1 text-blue-400">
                                                    <MapPin size={14} />
                                                    Collection
                                                </span>
                                            )}
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="grid grid-cols-2 gap-2">
                                            {order.status === 'PAID' && (
                                                <button
                                                    onClick={() => {
                                                        const tracking = prompt('Enter tracking number:');
                                                        if (tracking) handleUpdateStatus(order.id, 'SHIPPED', tracking);
                                                    }}
                                                    className="flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-sm font-bold text-sm"
                                                >
                                                    <Truck size={16} />
                                                    Mark Shipped
                                                </button>
                                            )}
                                            {order.status === 'SHIPPED' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                                                    className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-sm font-bold text-sm"
                                                >
                                                    <CheckCircle size={16} />
                                                    Complete
                                                </button>
                                            )}
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="flex items-center justify-center gap-2 py-3 bg-rudark-grey text-white rounded-sm font-bold text-sm"
                                            >
                                                <Eye size={16} />
                                                View Details
                                            </Link>
                                        </div>

                                        {/* Tracking Info */}
                                        {order.tracking_no && (
                                            <div className="text-xs text-gray-400">
                                                Tracking: <span className="text-white font-mono">{order.tracking_no}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                // Desktop Table View
                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-rudark-matte border-b border-rudark-grey">
                                <tr>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Order ID</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Customer</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Status</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Tracking</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Items</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Total</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Delivery</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Date</th>
                                    <th className="text-left p-4 text-xs font-mono text-rudark-volt uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-400">Loading orders...</td></tr>
                                ) : paginatedOrders.length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-400">No orders found</td></tr>
                                ) : (
                                    paginatedOrders.map((order) => (
                                        <tr key={order.id} className="border-b border-rudark-grey/30 hover:bg-rudark-matte/50">
                                            <td className="p-4"><span className="font-mono text-white text-sm">{order.id.slice(0, 12)}...</span></td>
                                            <td className="p-4">
                                                <div className="text-white text-sm">{order.customer_name}</div>
                                                <div className="text-gray-500 text-xs">{order.customer_phone}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                                                    <StatusIcon status={order.status} />
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {order.tracking_no && order.tracking_no !== 'PENDING' ? (
                                                    <span className="text-green-400 text-xs font-mono" title={order.tracking_no}>✓ {order.tracking_no.slice(-6)}</span>
                                                ) : order.tracking_no === 'PENDING' ? (
                                                    <span className="text-yellow-400 text-xs">⏳</span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-300 text-sm">{order.items_count} items</td>
                                            <td className="p-4 font-mono text-rudark-volt font-bold">RM {order.total_amount.toFixed(2)}</td>
                                            <td className="p-4">
                                                {order.delivery_method === 'self_collection' ? (
                                                    <span className="text-blue-400 text-xs uppercase">Collection</span>
                                                ) : (
                                                    <div>
                                                        <div className="text-gray-300 text-xs">Delivery</div>
                                                        {order.tracking_no && <div className="text-gray-500 text-xs font-mono">{order.tracking_no}</div>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-400 text-xs">{formatDate(order.created_at)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {order.customer_phone && (
                                                        <a
                                                            href={`https://wa.me/6${order.customer_phone.replace(/^0/, '')}?text=${encodeURIComponent(`Hi ${order.customer_name}, regarding your order ${order.id}...`)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-green-400 hover:text-green-300"
                                                            title="WhatsApp customer"
                                                        >
                                                            <MessageCircle size={16} />
                                                        </a>
                                                    )}
                                                    {order.status === 'PAID' && (
                                                        <button
                                                            onClick={() => {
                                                                const tracking = prompt('Enter tracking number:');
                                                                if (tracking) handleUpdateStatus(order.id, 'SHIPPED', tracking);
                                                            }}
                                                            className="px-2 py-1 bg-purple-600 text-white rounded-sm text-xs font-bold"
                                                        >
                                                            Ship
                                                        </button>
                                                    )}
                                                    <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-1 text-rudark-volt hover:text-white text-sm">
                                                        <Eye size={16} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            <div className="mt-4 flex justify-between items-center">
                <div className="text-gray-500 text-sm">
                    {paginatedOrders.length} of {allOrders.length}
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-rudark-grey text-gray-400 rounded-sm disabled:opacity-30"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-white text-sm">{currentPage}/{totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-rudark-grey text-gray-400 rounded-sm disabled:opacity-30"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
