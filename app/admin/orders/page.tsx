'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search, RefreshCw, Eye, Package, Clock, CheckCircle,
    Truck, XCircle, ChevronLeft, ChevronRight, ChevronDown,
    MapPin, Phone, Trash2, AlertTriangle, MessageCircle, Download
} from 'lucide-react';
import { getOrders, getOrderStats, OrderSummary, OrderLineItem, updateOrderStatus, bulkUpdateOrderStatus } from '@/actions/order-admin-actions';
import { cleanupStaleOrders } from '@/actions/order-cleanup';
import { useToast } from '@/components/ui/toast';

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
    DEPOSIT_PAID: 'bg-purple-50 text-purple-700 border-purple-200',
    BALANCE_DUE: 'bg-orange-50 text-orange-700 border-orange-200',
    PAID: 'bg-blue-50 text-blue-700 border-blue-200',
    PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    READY_TO_SHIP: 'bg-teal-50 text-teal-700 border-teal-200',
    SHIPPED: 'bg-green-50 text-green-700 border-green-200',
    DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
    REFUNDED: 'bg-pink-50 text-pink-700 border-pink-200',
    PAYMENT_FAILED: 'bg-red-50 text-red-700 border-red-200',
    SHIPMENT_FAILED: 'bg-red-50 text-red-700 border-red-200',
};

function getTodayRange() {
    const today = new Date().toISOString().split('T')[0];
    return { from: today, to: today };
}

function getThisWeekRange() {
    const now = new Date();
    const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now); monday.setDate(now.getDate() - diff); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { from: monday.toISOString().split('T')[0], to: sunday.toISOString().split('T')[0] };
}

function OrdersContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const today = useMemo(() => getTodayRange(), []);

    // ── Cursor pagination state ──────────────────────────────────────────────
    // cursorHistory[0] = cursor to reach page 1 (always null = first page)
    // cursorHistory[N] = cursor to reach page N+1
    const PAGE_SIZE = 30;
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
    const [currentPage, setCurrentPage] = useState(1); // 1-based, mirrors cursorHistory index
    const [searchMode, setSearchMode] = useState(false);
    // ── Filter state ─────────────────────────────────────────────────────────
    const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, shipped: 0, completed: 0, cancelled: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [dateFrom, setDateFrom] = useState(searchParams.get('from') || today.from);
    const [dateTo, setDateTo] = useState(searchParams.get('to') || today.to);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleExpandRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Convenience: the orders displayed are always `orders` (no extra slicing needed)
    const paginatedOrders = orders;

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    /** Fetch a specific page using a cursor. Pass null for the first page. */
    const fetchPage = async (cursor: string | null) => {
        setLoading(true);
        setExpandedRows(new Set());
        setSelectedIds(new Set());
        try {
            const [page, statsData] = await Promise.all([
                getOrders({ status: statusFilter, search: searchQuery, dateFrom, dateTo, pageSize: PAGE_SIZE, cursor }),
                getOrderStats(dateFrom || undefined, dateTo || undefined),
            ]);
            setOrders(page.orders);
            setNextCursor(page.nextCursor);
            setSearchMode(page.searchMode);
            setStats(statsData);
        } catch {
            showToast('error', 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    /** Reset to page 1 whenever filters change */
    const loadOrders = () => {
        setCursorHistory([null]);
        setCurrentPage(1);
        fetchPage(null);
    };

    useEffect(() => { loadOrders(); }, [statusFilter, dateFrom, dateTo]);

    const handleNextPage = () => {
        if (!nextCursor) return;
        setCursorHistory(h => [...h, nextCursor]);
        setCurrentPage(p => p + 1);
        fetchPage(nextCursor);
    };

    const handlePrevPage = () => {
        if (currentPage <= 1) return;
        const prevCursor = cursorHistory[currentPage - 2]; // history is 0-indexed
        setCursorHistory(h => h.slice(0, -1));
        setCurrentPage(p => p - 1);
        fetchPage(prevCursor ?? null);
    };

    // Sync active filters to URL so browser back/forward + bookmarks work
    useEffect(() => {
        const p = new URLSearchParams();
        if (statusFilter !== 'all') p.set('status', statusFilter);
        if (dateFrom) p.set('from', dateFrom);
        if (dateTo) p.set('to', dateTo);
        if (searchQuery) p.set('q', searchQuery);
        router.replace(`/admin/orders${p.size ? `?${p}` : ''}`, { scroll: false });
    }, [statusFilter, dateFrom, dateTo, searchQuery]);

    const handleSearch = () => loadOrders(); // resets to page 1 with current searchQuery

    const handleStatusClick = (status: string) =>
        setStatusFilter(status === statusFilter ? 'all' : status);

    const handleQuickDate = (range: 'today' | 'week' | 'month' | 'all') => {
        const now = new Date();
        if (range === 'today') { const t = getTodayRange(); setDateFrom(t.from); setDateTo(t.to); }
        else if (range === 'week') { const w = getThisWeekRange(); setDateFrom(w.from); setDateTo(w.to); }
        else if (range === 'month') {
            setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
            setDateTo(now.toISOString().split('T')[0]);
        } else { setDateFrom(''); setDateTo(''); }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string, trackingNumber?: string) => {
        const result = await updateOrderStatus(orderId, newStatus, trackingNumber);
        if (result.success) {
            showToast('success', `Order marked as ${newStatus}`);
            setSelectedOrder(null);
            setTrackingInputs(prev => { const n = { ...prev }; delete n[orderId]; return n; });
            loadOrders();
        } else {
            showToast('error', 'Failed to update status: ' + result.error);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === orders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(orders.map(o => o.id)));
        }
    };

    const handleBulkAction = async (newStatus: string) => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Mark ${selectedIds.size} order(s) as ${newStatus}?`)) return;
        setBulkProcessing(true);
        const result = await bulkUpdateOrderStatus(Array.from(selectedIds), newStatus);
        if (result.success) {
            showToast('success', `Updated ${result.updated} order(s) to ${newStatus}`);
            setSelectedIds(new Set());
            loadOrders();
        } else {
            showToast('error', 'Bulk update failed: ' + result.error);
        }
        setBulkProcessing(false);
    };

    const handleCleanup = async () => {
        if (!confirm('Delete all PENDING/FAILED orders older than 7 days? This cannot be undone.')) return;
        setLoading(true);
        try {
            const result = await cleanupStaleOrders();
            if (result.success) {
                showToast('success', result.message || 'Cleanup complete');
                loadOrders();
            } else {
                showToast('error', 'Cleanup failed: ' + result.error);
            }
        } catch {
            showToast('error', 'Error running cleanup');
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        // Export the current page's orders (cursor mode) or all search results
        const rows = [
            ['Order ID', 'Customer', 'Phone', 'Status', 'Total (RM)', 'Items', 'Delivery', 'Tracking', 'Date'],
            ...orders.map(o => [
                o.id, o.customer_name, o.customer_phone, o.status,
                o.total_amount.toFixed(2), o.items_count, o.delivery_method,
                o.tracking_no || '', o.created_at
            ])
        ];
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `orders-${dateFrom || 'all'}-to-${dateTo || 'all'}-page${currentPage}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // paginatedOrders already aliased above — remove duplicate

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const diff = (Date.now() - d.getTime()) / 60000;
        if (diff < 60) return `${Math.floor(diff)}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: '2-digit' });
    };

    const getStatusColor = (status: string) =>
        STATUS_COLORS[status?.toUpperCase()] || 'bg-gray-100 text-gray-500 border-gray-200';

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                    <p className="text-gray-500 text-sm">{orders.length} orders{searchMode ? ' found' : ` · page ${currentPage}`}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50" title="Export CSV">
                        <Download size={15} />
                        <span className="hidden md:inline">Export</span>
                    </button>
                    <button onClick={handleCleanup} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-500 rounded text-sm hover:bg-red-50" title="Delete stale pending orders">
                        <Trash2 size={15} />
                    </button>
                    <Link href="/admin/orders/ship-scan" className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                        📦 <span className="hidden md:inline">Scan Ship</span>
                    </Link>
                    <Link href="/admin/orders/batch-sync" className="flex items-center gap-1.5 px-3 py-2 bg-black text-rudark-volt border border-rudark-volt rounded text-sm hover:bg-rudark-volt hover:text-black transition-all">
                        <RefreshCw size={15} />
                        <span className="hidden md:inline">Sync POS</span>
                    </Link>
                    <Link href="/admin/orders/delivery-check" className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600">
                        🚚 <span>Delivery</span>
                    </Link>
                    <button onClick={loadOrders} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
                {[
                    { label: 'Total', value: stats.total, key: 'all', color: 'text-gray-900' },
                    { label: 'Paid', value: stats.paid, key: 'PAID', color: 'text-blue-600' },
                    { label: 'Shipped', value: stats.shipped, key: 'SHIPPED', color: 'text-green-600' },
                    { label: 'Pending', value: stats.pending, key: 'PENDING', color: 'text-amber-600' },
                    { label: 'Done', value: stats.completed, key: 'COMPLETED', color: 'text-emerald-600' },
                ].map(({ label, value, key, color }) => (
                    <button
                        key={key}
                        onClick={() => handleStatusClick(key)}
                        className={`bg-white border rounded-lg p-3 text-left transition-colors ${statusFilter === key ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                        <div className={`text-xl font-bold ${color}`}>{value}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                    </button>
                ))}
                <div className="hidden md:block bg-white border border-gray-200 rounded-lg p-3">
                    <div className="text-xl font-bold text-blue-600">RM {stats.totalRevenue.toFixed(0)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">Revenue</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="flex flex-1 gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3">
                            <Search size={15} className="text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Order ID, name, phone, tracking..."
                                className="flex-1 bg-transparent text-gray-900 text-sm py-2 focus:outline-none"
                            />
                        </div>
                        <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white font-medium rounded text-sm hover:bg-blue-700">
                            Search
                        </button>
                    </div>

                    {/* Date range */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="text-sm border border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:border-blue-400"
                        />
                        <span className="text-gray-400 text-sm">–</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="text-sm border border-gray-200 rounded px-2 py-1.5 text-gray-700 focus:outline-none focus:border-blue-400"
                        />
                    </div>
                </div>

                {/* Quick date presets */}
                <div className="flex gap-2 mt-3">
                    {(['today', 'week', 'month', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => handleQuickDate(range)}
                            className={`px-3 py-1 text-xs border rounded transition-colors ${
                                range === 'today' && dateFrom === today.from
                                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                    <span className="text-sm font-medium text-blue-700">{selectedIds.size} selected</span>
                    <div className="flex gap-2 ml-auto">
                        <button onClick={() => handleBulkAction('COMPLETED')} disabled={bulkProcessing}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 disabled:opacity-50">
                            Mark Completed
                        </button>
                        <button onClick={() => handleBulkAction('PAID')} disabled={bulkProcessing}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50">
                            Mark Paid
                        </button>
                        <button onClick={() => handleBulkAction('CANCELLED')} disabled={bulkProcessing}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 disabled:opacity-50">
                            Cancel
                        </button>
                        <button onClick={() => setSelectedIds(new Set())}
                            className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded hover:bg-gray-50">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile card view */}
            {isMobile ? (
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading...</div>
                    ) : paginatedOrders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">No orders found</div>
                    ) : (
                        paginatedOrders.map((order) => (
                            <div key={order.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                                    className="w-full p-4 text-left"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                                            <div className="text-xs text-gray-400 font-mono">{order.id.slice(0, 12)}...</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-900">RM {order.total_amount.toFixed(2)}</div>
                                            <div className="text-xs text-gray-400">{formatDate(order.created_at)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <span className="text-xs">{order.items_count} items</span>
                                            <ChevronDown size={15} className={`transition-transform ${selectedOrder === order.id ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </button>

                                {selectedOrder === order.id && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                                        <div className="flex gap-3 text-sm">
                                            <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-blue-600">
                                                <Phone size={13} />{order.customer_phone}
                                            </a>
                                            {order.delivery_method === 'self_collection' && (
                                                <span className="flex items-center gap-1 text-gray-500">
                                                    <MapPin size={13} />Collection
                                                </span>
                                            )}
                                        </div>

                                        {order.status === 'PAID' && (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Enter tracking number"
                                                    value={trackingInputs[order.id] || ''}
                                                    onChange={(e) => setTrackingInputs(p => ({ ...p, [order.id]: e.target.value }))}
                                                    className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-400"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const tracking = trackingInputs[order.id]?.trim();
                                                        if (!tracking) { showToast('warning', 'Please enter a tracking number'); return; }
                                                        handleUpdateStatus(order.id, 'SHIPPED', tracking);
                                                    }}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700"
                                                >
                                                    <Truck size={15} />Mark Shipped
                                                </button>
                                            </div>
                                        )}
                                        {order.status === 'SHIPPED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded font-medium text-sm hover:bg-emerald-700"
                                            >
                                                <CheckCircle size={15} />Mark Complete
                                            </button>
                                        )}
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-700 rounded font-medium text-sm hover:bg-gray-50"
                                        >
                                            <Eye size={15} />View Details
                                        </Link>
                                        {order.tracking_no && (
                                            <div className="text-xs text-gray-400">
                                                Tracking: <span className="text-gray-700 font-mono">{order.tracking_no}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Desktop table */
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-8" />
                                <th className="px-4 py-3 w-10">
                                    <input type="checkbox"
                                        checked={paginatedOrders.length > 0 && selectedIds.size === paginatedOrders.length}
                                        onChange={toggleSelectAll}
                                        className="accent-blue-600 cursor-pointer" />
                                </th>
                                {['Order ID', 'Customer', 'Status', 'Total', 'Date', 'Tracking', 'Actions'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading...</td></tr>
                            ) : paginatedOrders.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No orders found</td></tr>
                            ) : (
                                paginatedOrders.flatMap((order) => {
                                    const isExpanded = expandedRows.has(order.id);
                                    return [
                                        <tr key={order.id} className={`hover:bg-gray-50 ${selectedIds.has(order.id) ? 'bg-blue-50/40' : ''}`}>
                                            <td className="px-2 py-3 w-8">
                                                <button
                                                    onClick={() => toggleExpandRow(order.id)}
                                                    className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                                                    title={isExpanded ? 'Collapse' : 'Show items'}
                                                >
                                                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 w-10">
                                                <input type="checkbox"
                                                    checked={selectedIds.has(order.id)}
                                                    onChange={() => toggleSelect(order.id)}
                                                    className="accent-blue-600 cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-gray-700 text-sm">{order.id.slice(0, 14)}…</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                                                <div className="text-xs text-gray-400">{order.customer_phone}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                RM {order.total_amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-400">{formatDate(order.created_at)}</td>
                                            <td className="px-4 py-3">
                                                {order.tracking_no && order.tracking_no !== 'PENDING' ? (
                                                    <span className="text-green-600 text-xs font-mono">✓ {order.tracking_no.slice(-8)}</span>
                                                ) : order.tracking_no === 'PENDING' ? (
                                                    <span className="text-amber-500 text-xs">Pending</span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {order.customer_phone && (
                                                        <a
                                                            href={`https://wa.me/6${order.customer_phone.replace(/^0/, '')}?text=${encodeURIComponent(`Hi ${order.customer_name}, regarding your order ${order.id}`)}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded"
                                                            title="WhatsApp"
                                                        >
                                                            <MessageCircle size={15} />
                                                        </a>
                                                    )}
                                                    {order.status === 'PAID' && (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Tracking no."
                                                                value={trackingInputs[order.id] || ''}
                                                                onChange={(e) => setTrackingInputs(p => ({ ...p, [order.id]: e.target.value }))}
                                                                className="text-xs border border-gray-200 rounded px-2 py-1 w-28 focus:outline-none focus:border-blue-400"
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const t = trackingInputs[order.id]?.trim();
                                                                    if (!t) { showToast('warning', 'Enter tracking number first'); return; }
                                                                    handleUpdateStatus(order.id, 'SHIPPED', t);
                                                                }}
                                                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                                                            >
                                                                Ship
                                                            </button>
                                                        </div>
                                                    )}
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                                                        title="View details"
                                                    >
                                                        <Eye size={15} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>,
                                        isExpanded && (
                                            <tr key={`${order.id}-items`} className="bg-slate-50 border-b border-gray-100">
                                                <td colSpan={9} className="px-8 py-3">
                                                    {order.items.length === 0 ? (
                                                        <p className="text-xs text-gray-400 italic">No item data available</p>
                                                    ) : (
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="text-gray-400 border-b border-gray-200">
                                                                    <th className="text-left pb-1.5 font-medium">Product</th>
                                                                    <th className="text-left pb-1.5 font-medium">SKU</th>
                                                                    <th className="text-left pb-1.5 font-medium">Options</th>
                                                                    <th className="text-right pb-1.5 font-medium">Qty</th>
                                                                    <th className="text-right pb-1.5 font-medium">Unit Price</th>
                                                                    <th className="text-right pb-1.5 font-medium">Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {order.items.map((item: OrderLineItem, i: number) => {
                                                                    const unitPrice = item.promo_price ?? item.price;
                                                                    const options = item.selected_options
                                                                        ? Object.values(item.selected_options).join(' / ')
                                                                        : '—';
                                                                    return (
                                                                        <tr key={i} className="text-gray-700">
                                                                            <td className="py-1.5 pr-4 font-medium">{item.name}</td>
                                                                            <td className="py-1.5 pr-4 font-mono text-gray-400">{item.sku || '—'}</td>
                                                                            <td className="py-1.5 pr-4 text-gray-500">{options}</td>
                                                                            <td className="py-1.5 text-right">{item.quantity}</td>
                                                                            <td className="py-1.5 text-right">RM {unitPrice.toFixed(2)}</td>
                                                                            <td className="py-1.5 text-right font-semibold">RM {(unitPrice * item.quantity).toFixed(2)}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    ].filter(Boolean);
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}

            <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    {searchMode
                        ? `${orders.length} result${orders.length !== 1 ? 's' : ''} found`
                        : `Page ${currentPage} · ${orders.length} order${orders.length !== 1 ? 's' : ''}${nextCursor ? '+' : ''}`
                    }
                </div>
                {!searchMode && (currentPage > 1 || nextCursor) && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage <= 1 || loading}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 rounded text-sm disabled:opacity-30 hover:bg-gray-50"
                        >
                            <ChevronLeft size={15} /> Prev
                        </button>
                        <span className="px-3 py-1.5 text-gray-700 text-sm font-medium">{currentPage}</span>
                        <button
                            onClick={handleNextPage}
                            disabled={!nextCursor || loading}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 rounded text-sm disabled:opacity-30 hover:bg-gray-50"
                        >
                            Next <ChevronRight size={15} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function OrdersPage() {
    return (
        <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading orders…</div>}>
            <OrdersContent />
        </Suspense>
    );
}
