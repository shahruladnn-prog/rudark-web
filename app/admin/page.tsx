'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Package, ShoppingCart, AlertTriangle, Clock, TrendingUp,
    Scan, Search, Truck, CheckCircle, RefreshCw, X, Camera
} from 'lucide-react';
import { getOrderStats, getOrders, updateOrderStatus } from '@/actions/order-admin-actions';
import { getProducts } from '@/actions/product-actions';
import { DashboardSkeleton, StatsCardSkeleton, CardSkeleton } from '@/components/ui/skeleton';
import { useSuccessAnimation } from '@/components/ui/success-animation';

interface DashboardStats {
    today: { orders: number; revenue: number };
    pending: { shipment: number; stuck: number };
    stock: { low: number; out: number };
    recentOrders: any[];
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        today: { orders: 0, revenue: 0 },
        pending: { shipment: 0, stuck: 0 },
        stock: { low: 0, out: 0 },
        recentOrders: []
    });
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
            const [ordersData, productsData] = await Promise.all([
                getOrders({ limit: 50 }),
                getProducts()
            ]);

            const today = new Date().toDateString();
            const todayOrders = ordersData.filter((o: any) =>
                new Date(o.created_at).toDateString() === today
            );

            const paidOrders = ordersData.filter((o: any) => o.status === 'PAID');
            const stuckOrders = ordersData.filter((o: any) => {
                if (o.status !== 'PAID') return false;
                const hrs = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
                return hrs > 24;
            });

            const lowStock = productsData.filter((p: any) => {
                const avail = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
                return avail > 0 && avail <= 5;
            });
            const outStock = productsData.filter((p: any) => {
                const avail = (p.stock_quantity || 0) - (p.reserved_quantity || 0);
                return avail <= 0;
            });

            setStats({
                today: {
                    orders: todayOrders.length,
                    revenue: todayOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
                },
                pending: {
                    shipment: paidOrders.length,
                    stuck: stuckOrders.length
                },
                stock: {
                    low: lowStock.length,
                    out: outStock.length
                },
                recentOrders: ordersData.slice(0, 5)
            });
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            const orders = await getOrders({ limit: 100 });
            const query = searchQuery.toLowerCase().trim();
            const found = orders.find((o: any) =>
                o.id.toLowerCase().includes(query) ||
                o.order_id?.toLowerCase().includes(query) ||
                o.customer_name?.toLowerCase().includes(query) ||
                o.customer_email?.toLowerCase().includes(query) ||
                o.tracking_number?.toLowerCase().includes(query)
            );
            setSearchResult(found || { notFound: true, query: searchQuery });
        } catch (error) {
            console.error('Search error:', error);
        }
    };

    const handleMarkShipped = async (orderId: string) => {
        const tracking = prompt('Enter tracking number:');
        if (tracking) {
            await updateOrderStatus(orderId, 'SHIPPED', tracking);
            showSuccess('shipped', 'Order Shipped!');
            setSearchResult(null);
            setSearchQuery('');
            loadDashboard();
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
            {/* Success Animation Overlay */}
            {SuccessOverlay}

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-4xl font-condensed font-bold text-white uppercase">
                        Action <span className="text-rudark-volt">Hub</span>
                    </h1>
                    <p className="text-gray-500 text-sm font-mono hidden md:block">Quick overview and actions</p>
                </div>
                <button
                    onClick={loadDashboard}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-rudark-volt"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Show skeleton while loading */}
            {loading ? (
                <DashboardSkeleton />
            ) : (
                <>
                    {/* Today's Overview */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                            <div className="text-3xl font-bold text-white">{stats.today.orders}</div>
                            <div className="text-xs text-gray-500 uppercase">Orders Today</div>
                        </div>
                        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                            <div className="text-3xl font-bold text-rudark-volt">{formatCurrency(stats.today.revenue)}</div>
                            <div className="text-xs text-gray-500 uppercase">Revenue Today</div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4 mb-6">
                        <h2 className="text-sm font-bold text-gray-400 uppercase mb-3">Quick Actions</h2>

                        {/* Search Bar */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 flex items-center gap-2 bg-rudark-matte border border-rudark-grey rounded-sm px-3">
                                <Search size={16} className="text-gray-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="Order ID, name, tracking..."
                                    className="flex-1 bg-transparent text-white text-sm py-2 focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                className="px-4 py-2 bg-rudark-volt text-black font-bold rounded-sm text-sm"
                            >
                                Find
                            </button>
                            {isMobile && (
                                <button
                                    onClick={() => setShowScanner(true)}
                                    className="px-3 py-2 bg-gray-700 text-white rounded-sm"
                                >
                                    <Camera size={18} />
                                </button>
                            )}
                        </div>

                        {/* Search Result */}
                        {searchResult && (
                            <div className="mb-4">
                                {searchResult.notFound ? (
                                    <div className="bg-red-900/20 border border-red-500/30 rounded-sm p-3 text-red-400 text-sm">
                                        No order found for "{searchResult.query}"
                                    </div>
                                ) : (
                                    <div className="bg-rudark-matte border border-rudark-volt rounded-sm p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-bold text-white">{searchResult.customer_name}</div>
                                                <div className="text-sm text-gray-400 font-mono">{searchResult.order_id || searchResult.id.slice(0, 8)}</div>
                                            </div>
                                            <button onClick={() => setSearchResult(null)} className="text-gray-500">
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 mb-3 text-xs">
                                            <span className={`px-2 py-1 rounded ${searchResult.status === 'PAID' ? 'bg-green-900/30 text-green-400' :
                                                searchResult.status === 'SHIPPED' ? 'bg-blue-900/30 text-blue-400' :
                                                    'bg-yellow-900/30 text-yellow-400'
                                                }`}>
                                                {searchResult.status}
                                            </span>
                                            <span className="text-gray-400">{formatCurrency(searchResult.total || 0)}</span>
                                        </div>
                                        {searchResult.status === 'PAID' && (
                                            <button
                                                onClick={() => handleMarkShipped(searchResult.id)}
                                                className="w-full flex items-center justify-center gap-2 py-2 bg-rudark-volt text-black font-bold rounded-sm text-sm"
                                            >
                                                <Truck size={16} />
                                                Mark as Shipped
                                            </button>
                                        )}
                                        {searchResult.status === 'SHIPPED' && searchResult.tracking_number && (
                                            <div className="text-sm text-gray-400">
                                                Tracking: <span className="text-white font-mono">{searchResult.tracking_number}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Quick Links */}
                        <div className="grid grid-cols-2 gap-2">
                            <Link
                                href="/admin/orders"
                                className="flex items-center gap-2 px-3 py-2 bg-rudark-matte text-gray-300 rounded-sm text-sm hover:bg-gray-700"
                            >
                                <ShoppingCart size={16} />
                                All Orders
                            </Link>
                            <Link
                                href="/admin/stock"
                                className="flex items-center gap-2 px-3 py-2 bg-rudark-matte text-gray-300 rounded-sm text-sm hover:bg-gray-700"
                            >
                                <Package size={16} />
                                Check Stock
                            </Link>
                        </div>
                    </div>

                    {/* Needs Attention */}
                    {(stats.pending.shipment > 0 || stats.stock.out > 0 || stats.pending.stuck > 0) && (
                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-sm p-4 mb-6">
                            <h2 className="text-sm font-bold text-yellow-400 uppercase mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Needs Attention
                            </h2>
                            <div className="space-y-2">
                                {stats.pending.shipment > 0 && (
                                    <Link href="/admin/orders?status=PAID" className="flex items-center justify-between p-2 bg-rudark-matte/50 rounded-sm hover:bg-rudark-matte">
                                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                                            <Truck size={14} className="text-yellow-400" />
                                            <span>{stats.pending.shipment} orders awaiting shipment</span>
                                        </div>
                                        <span className="text-xs text-gray-500">→</span>
                                    </Link>
                                )}
                                {stats.pending.stuck > 0 && (
                                    <div className="flex items-center gap-2 p-2 bg-red-900/20 rounded-sm text-red-400 text-sm">
                                        <Clock size={14} />
                                        <span>{stats.pending.stuck} order(s) stuck &gt; 24h!</span>
                                    </div>
                                )}
                                {stats.stock.out > 0 && (
                                    <Link href="/admin/stock?filter=out" className="flex items-center justify-between p-2 bg-rudark-matte/50 rounded-sm hover:bg-rudark-matte">
                                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                                            <Package size={14} className="text-red-400" />
                                            <span>{stats.stock.out} items out of stock</span>
                                        </div>
                                        <span className="text-xs text-gray-500">→</span>
                                    </Link>
                                )}
                                {stats.stock.low > 0 && (
                                    <Link href="/admin/stock?filter=low" className="flex items-center justify-between p-2 bg-rudark-matte/50 rounded-sm hover:bg-rudark-matte">
                                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                                            <AlertTriangle size={14} className="text-yellow-400" />
                                            <span>{stats.stock.low} items low stock (≤5)</span>
                                        </div>
                                        <span className="text-xs text-gray-500">→</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recent Orders */}
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-sm font-bold text-gray-400 uppercase">Recent Orders</h2>
                            <Link href="/admin/orders" className="text-xs text-rudark-volt">View All →</Link>
                        </div>

                        {stats.recentOrders.length === 0 ? (
                            <div className="text-gray-500 text-sm text-center py-4">No recent orders</div>
                        ) : (
                            <div className="space-y-2">
                                {stats.recentOrders.map((order: any) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between p-3 bg-rudark-matte rounded-sm"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-white text-sm truncate">{order.customer_name}</div>
                                            <div className="text-xs text-gray-500">{formatTime(order.created_at)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-rudark-volt font-mono">{formatCurrency(order.total || 0)}</div>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${order.status === 'PAID' ? 'bg-green-900/30 text-green-400' :
                                                order.status === 'SHIPPED' ? 'bg-blue-900/30 text-blue-400' :
                                                    order.status === 'COMPLETED' ? 'bg-gray-700 text-gray-300' :
                                                        'bg-yellow-900/30 text-yellow-400'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Barcode Scanner Modal */}
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

// Barcode Scanner Component
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
                    () => { } // Ignore errors during scanning
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
