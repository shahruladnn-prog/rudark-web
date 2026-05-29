'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Package, ShoppingCart, AlertTriangle, Clock, Truck,
    Scan, Search, CheckCircle, RefreshCw, X, Camera
} from 'lucide-react';
import { getDashboardStats, getOrders, initOrderCounters, updateOrderStatus } from '@/actions/order-admin-actions';
import { getProducts } from '@/actions/product-actions';
import { useToast } from '@/components/ui/toast';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { useSuccessAnimation } from '@/components/ui/success-animation';

interface DashboardStats {
    today: { orders: number; revenue: number };
    pending: { shipment: number; stuck: number };
    stock: { low: number; out: number };
    recentOrders: any[];
    countersSeeded: boolean;
}

export default function AdminDashboard() {
    const { showToast } = useToast();
    const [stats, setStats] = useState<DashboardStats>({
        today: { orders: 0, revenue: 0 },
        pending: { shipment: 0, stuck: 0 },
        stock: { low: 0, out: 0 },
        recentOrders: [],
        countersSeeded: true,
    });
    const [seedingCounters, setSeedingCounters] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<any>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { showSuccess, SuccessOverlay } = useSuccessAnimation();

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const [dashStats, productsData] = await Promise.all([
                getDashboardStats(),
                getProducts()
            ]);

            const lowStock = productsData.filter((p: any) => {
                const avail = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
                const rp = p.reorder_point ?? 5;
                return avail > 0 && avail <= rp;
            });
            const outStock = productsData.filter((p: any) => {
                const avail = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
                return avail <= 0;
            });

            setStats({
                today: dashStats.today,
                pending: dashStats.pending,
                stock: { low: lowStock.length, out: outStock.length },
                recentOrders: dashStats.recentOrders,
                countersSeeded: dashStats.countersSeeded ?? true,
            });
        } catch (error) {
            console.error('Dashboard load error:', error);
            showToast('error', 'Failed to load dashboard data');
        }
        setLoading(false);
    };

    useEffect(() => { loadDashboard(); }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            const { orders } = await getOrders({ search: searchQuery.trim() });
            const found = orders[0] || null;
            setSearchResult(found ? found : { notFound: true, query: searchQuery });
        } catch (error) {
            showToast('error', 'Search failed');
        }
    };

    const handleSeedCounters = async () => {
        setSeedingCounters(true);
        try {
            const result = await initOrderCounters();
            if (result.success) {
                showToast('success', 'Stats counters seeded successfully');
                loadDashboard();
            } else {
                showToast('error', 'Seeding failed: ' + result.error);
            }
        } finally {
            setSeedingCounters(false);
        }
    };

    const handleMarkShipped = async (orderId: string) => {
        const tracking = prompt('Enter tracking number:');
        if (!tracking?.trim()) return;
        const result = await updateOrderStatus(orderId, 'SHIPPED', tracking.trim());
        if (result.success) {
            showSuccess('shipped', 'Order Shipped!');
            setSearchResult(null);
            setSearchQuery('');
            loadDashboard();
        } else {
            showToast('error', 'Failed to update order status');
        }
    };

    const handleBarcodeResult = (code: string) => {
        setShowScanner(false);
        setSearchQuery(code);
        setTimeout(handleSearch, 100);
    };

    const formatCurrency = (amount: number) => `RM ${amount.toFixed(2)}`;
    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / (1000 * 60);
        if (diff < 60) return `${Math.floor(diff)}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' });
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {SuccessOverlay}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm hidden md:block">Overview &amp; quick actions</p>
                </div>
                <button
                    onClick={loadDashboard}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <DashboardSkeleton />
            ) : (
                <>
                    {/* Stock Alert Banner */}
                    {(stats.stock.low > 0 || stats.stock.out > 0) && (
                        <div className={`mb-5 flex items-center justify-between px-4 py-3 rounded-lg border ${
                            stats.stock.out > 0
                                ? 'bg-red-50 border-red-200'
                                : 'bg-amber-50 border-amber-200'
                        }`}>
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle size={16} className={stats.stock.out > 0 ? 'text-red-500' : 'text-amber-500'} />
                                <span className="text-sm font-medium text-gray-800">
                                    {stats.stock.out > 0 && (
                                        <span className="text-red-600 font-bold">{stats.stock.out} out of stock</span>
                                    )}
                                    {stats.stock.out > 0 && stats.stock.low > 0 && <span className="text-gray-400 mx-2">·</span>}
                                    {stats.stock.low > 0 && (
                                        <span className="text-amber-600 font-bold">{stats.stock.low} low stock</span>
                                    )}
                                    <span className="text-gray-500 ml-1 font-normal"> — restock soon</span>
                                </span>
                            </div>
                            <Link href="/admin/stock" className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap">
                                View Stock →
                            </Link>
                        </div>
                    )}

                    {/* Today stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="text-2xl font-bold text-gray-900">{stats.today.orders}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Orders Today</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.today.revenue)}</div>
                            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Revenue Today</div>
                        </div>
                    </div>

                    {/* Quick search */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Search</h2>
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3">
                                <Search size={15} className="text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Order ID, name, tracking..."
                                    className="flex-1 bg-transparent text-gray-900 text-sm py-2 focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded text-sm hover:bg-blue-700"
                            >
                                Find
                            </button>
                            {isMobile && (
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                >
                                    <Camera size={18} />
                                </button>
                            )}
                        </div>

                        {searchResult && (
                            <div className="mb-4">
                                {searchResult.notFound ? (
                                    <div className="bg-red-50 border border-red-200 rounded p-3 text-red-600 text-sm">
                                        No order found for &ldquo;{searchResult.query}&rdquo;
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-semibold text-gray-900">{searchResult.customer_name}</div>
                                                <div className="text-sm text-gray-500 font-mono">{searchResult.id.slice(0, 12)}...</div>
                                            </div>
                                            <button onClick={() => setSearchResult(null)} className="text-gray-400 hover:text-gray-600">
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 mb-3 text-xs">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-medium">{searchResult.status}</span>
                                            <span className="text-gray-600">{formatCurrency(searchResult.total_amount || 0)}</span>
                                        </div>
                                        {searchResult.status === 'PAID' && (
                                            <button
                                                onClick={() => handleMarkShipped(searchResult.id)}
                                                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white font-medium rounded text-sm hover:bg-blue-700"
                                            >
                                                <Truck size={15} />
                                                Mark as Shipped
                                            </button>
                                        )}
                                        {searchResult.tracking_no && (
                                            <div className="text-sm text-gray-500 mt-2">
                                                Tracking: <span className="text-gray-900 font-mono">{searchResult.tracking_no}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <Link href="/admin/orders" className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded text-sm hover:bg-gray-100 border border-gray-200">
                                <ShoppingCart size={15} />
                                All Orders
                            </Link>
                            <Link href="/admin/stock" className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded text-sm hover:bg-gray-100 border border-gray-200">
                                <Package size={15} />
                                Check Stock
                            </Link>
                        </div>
                    </div>

                    {/* Needs attention */}
                    {(stats.pending.shipment > 0 || stats.stock.out > 0 || stats.pending.stuck > 0 || stats.stock.low > 0) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                            <h2 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                                <AlertTriangle size={15} />
                                Needs Attention
                            </h2>
                            <div className="space-y-2">
                                {stats.pending.shipment > 0 && (
                                    <Link href="/admin/orders?status=PAID" className="flex items-center justify-between p-2 bg-white rounded border border-amber-100 hover:border-amber-300 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Truck size={13} className="text-amber-600" />
                                            {stats.pending.shipment} orders awaiting shipment
                                        </div>
                                        <span className="text-gray-400 text-xs">→</span>
                                    </Link>
                                )}
                                {stats.pending.stuck > 0 && (
                                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200 text-sm text-red-700">
                                        <Clock size={13} />
                                        {stats.pending.stuck} order(s) stuck &gt; 24h — check payment
                                    </div>
                                )}
                                {stats.stock.out > 0 && (
                                    <Link href="/admin/stock?filter=out" className="flex items-center justify-between p-2 bg-white rounded border border-amber-100 hover:border-amber-300 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Package size={13} className="text-red-500" />
                                            {stats.stock.out} items out of stock
                                        </div>
                                        <span className="text-gray-400 text-xs">→</span>
                                    </Link>
                                )}
                                {stats.stock.low > 0 && (
                                    <Link href="/admin/stock?filter=low" className="flex items-center justify-between p-2 bg-white rounded border border-amber-100 hover:border-amber-300 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={13} className="text-amber-600" />
                                            {stats.stock.low} items low stock (≤5)
                                        </div>
                                        <span className="text-gray-400 text-xs">→</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recent orders */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
                            <h2 className="text-sm font-semibold text-gray-700">Recent Orders</h2>
                            <Link href="/admin/orders" className="text-xs text-blue-600 hover:underline">View all →</Link>
                        </div>
                        {stats.recentOrders.length === 0 ? (
                            <div className="text-gray-400 text-sm text-center py-6">No recent orders</div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {stats.recentOrders.map((order: any) => (
                                    <Link
                                        key={order.id}
                                        href={`/admin/orders/${order.id}`}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                                    >
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                                            <div className="text-xs text-gray-400">{formatTime(order.created_at)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-gray-900">RM {(order.total_amount || 0).toFixed(2)}</div>
                                            <span className="text-xs text-gray-500">{order.status}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {showScanner && (
                        <BarcodeScanner
                            onResult={handleBarcodeResult}
                            onClose={() => setShowScanner(false)}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function BarcodeScanner({ onResult, onClose }: { onResult: (code: string) => void; onClose: () => void }) {
    const scannerRef = useRef<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let html5QrCode: any = null;

        const startScanner = async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                html5QrCode = new Html5Qrcode('qr-reader');
                scannerRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 100 } },
                    (decodedText: string) => {
                        html5QrCode.stop();
                        onResult(decodedText);
                    },
                    () => { }
                );
            } catch (err: any) {
                setError(err.message || 'Camera access denied');
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, [onResult]);

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            <div className="flex justify-between items-center p-4 text-white">
                <span className="font-bold">Scan Barcode</span>
                <button onClick={onClose}>
                    <X size={24} />
                </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
                {error ? (
                    <div className="text-red-400 text-center p-4">
                        <p>{error}</p>
                        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-700 rounded">
                            Close
                        </button>
                    </div>
                ) : (
                    <div id="qr-reader" className="w-full max-w-md" />
                )}
            </div>
            <div className="p-4 text-center text-gray-400 text-sm">
                Point camera at tracking barcode
            </div>
        </div>
    );
}
