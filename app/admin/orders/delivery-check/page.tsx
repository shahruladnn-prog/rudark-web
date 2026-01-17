'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    getShippedOrdersForDeliveryCheck,
    batchCheckDeliveryStatuses
} from '@/actions/parcelasia-sync';

interface ShippedOrder {
    id: string;
    tracking_no: string;
    customer_name: string;
    shipped_at: string;
}

interface CheckResult {
    success: boolean;
    orderId: string;
    tracking_no: string;
    status?: string;
    isDelivered: boolean;
    deliveredAt?: string;
    error?: string;
}

export default function DeliveryCheckPage() {
    const [loading, setLoading] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [orders, setOrders] = useState<ShippedOrder[]>([]);
    const [results, setResults] = useState<CheckResult[] | null>(null);
    const [stats, setStats] = useState<{
        total: number;
        delivered: number;
        pending: number;
        failed: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Load shipped orders
    async function loadOrders() {
        setLoadingOrders(true);
        setError(null);

        try {
            const result = await getShippedOrdersForDeliveryCheck();
            if (result.success) {
                setOrders(result.orders);
            } else {
                setError(result.error || 'Failed to load orders');
            }
        } catch (err) {
            setError('Failed to load shipped orders');
        } finally {
            setLoadingOrders(false);
        }
    }

    // Check all delivery statuses
    async function handleCheckAll() {
        setLoading(true);
        setError(null);
        setResults(null);
        setStats(null);

        try {
            const result = await batchCheckDeliveryStatuses();

            if (result.success) {
                setResults(result.results);
                setStats({
                    total: result.total,
                    delivered: result.delivered,
                    pending: result.pending,
                    failed: result.failed
                });

                // Refresh orders list to show updated statuses
                await loadOrders();
            } else {
                setError('Failed to check delivery statuses');
            }
        } catch (err) {
            setError('Failed to check delivery statuses');
        } finally {
            setLoading(false);
        }
    }

    // Load orders on first render
    useEffect(() => {
        loadOrders();
    }, []);

    return (
        <div className="admin-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="admin-header">
                <Link href="/admin/orders" className="back-link">← Back to Orders</Link>
                <h1>🚚 Delivery Status Check</h1>
                <p className="subtitle">
                    Check if shipped orders have been delivered (via ParcelAsia tracking)
                </p>
            </div>

            {/* Info Box */}
            <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
            }}>
                <div style={{ color: '#60A5FA', fontWeight: 'bold', marginBottom: '8px' }}>
                    ℹ️ How it works
                </div>
                <ul style={{ color: '#94A3B8', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                    <li>Checks all orders with status <strong>SHIPPED</strong></li>
                    <li>Uses ParcelAsia tracking to detect delivered packages</li>
                    <li>Auto-updates orders to <strong>DELIVERED</strong> when confirmed</li>
                    <li>Recommended: Run 1-2 times daily</li>
                </ul>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    padding: '16px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    color: '#F87171'
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Summary Stats */}
            {stats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ color: '#888', fontSize: '12px' }}>TOTAL CHECKED</div>
                        <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
                    </div>
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                        <div style={{ color: '#4ADE80', fontSize: '12px' }}>DELIVERED</div>
                        <div style={{ color: '#4ADE80', fontSize: '24px', fontWeight: 'bold' }}>{stats.delivered}</div>
                    </div>
                    <div style={{
                        background: 'rgba(234, 179, 8, 0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center',
                        border: '1px solid rgba(234, 179, 8, 0.3)'
                    }}>
                        <div style={{ color: '#FACC15', fontSize: '12px' }}>IN TRANSIT</div>
                        <div style={{ color: '#FACC15', fontSize: '24px', fontWeight: 'bold' }}>{stats.pending}</div>
                    </div>
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        <div style={{ color: '#F87171', fontSize: '12px' }}>FAILED</div>
                        <div style={{ color: '#F87171', fontSize: '24px', fontWeight: 'bold' }}>{stats.failed}</div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button
                    onClick={handleCheckAll}
                    disabled={loading}
                    style={{
                        flex: 2,
                        padding: '16px 24px',
                        background: loading
                            ? 'rgba(100,100,100,0.3)'
                            : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        cursor: loading ? 'wait' : 'pointer',
                        boxShadow: loading ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.4)'
                    }}
                >
                    {loading ? (
                        <>⏳ Checking... (this may take a minute)</>
                    ) : (
                        <>🔍 Check All Shipped Orders</>
                    )}
                </button>
                <button
                    onClick={loadOrders}
                    disabled={loadingOrders}
                    style={{
                        flex: 1,
                        padding: '16px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Orders List */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                }}>
                    <h2 style={{ color: 'white', fontSize: '18px', margin: 0 }}>
                        📦 Shipped Orders ({orders.length})
                    </h2>
                </div>

                {loadingOrders ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        Loading orders...
                    </div>
                ) : orders.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        borderRadius: '12px',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                        <div style={{ color: '#4ADE80', fontWeight: 'bold' }}>
                            No shipped orders pending!
                        </div>
                        <div style={{ color: '#888', fontSize: '14px' }}>
                            All orders have been delivered.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {orders.map((order) => {
                            const result = results?.find(r => r.orderId === order.id);

                            return (
                                <div
                                    key={order.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '16px',
                                        background: result?.isDelivered
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'rgba(255,255,255,0.05)',
                                        border: result?.isDelivered
                                            ? '1px solid rgba(34, 197, 94, 0.3)'
                                            : '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                >
                                    {/* Status Icon */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: result?.isDelivered
                                            ? '#22C55E'
                                            : result?.error
                                                ? 'rgba(239, 68, 68, 0.3)'
                                                : 'rgba(234, 179, 8, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px'
                                    }}>
                                        {result?.isDelivered ? '✓' : result?.error ? '!' : '📦'}
                                    </div>

                                    {/* Order Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: 'white', fontWeight: 'bold' }}>
                                            {order.customer_name}
                                        </div>
                                        <div style={{
                                            color: '#22D3EE',
                                            fontSize: '12px',
                                            fontFamily: 'monospace'
                                        }}>
                                            {order.tracking_no}
                                        </div>
                                        {result && (
                                            <div style={{
                                                color: result.isDelivered ? '#4ADE80' : '#888',
                                                fontSize: '12px',
                                                marginTop: '4px'
                                            }}>
                                                {result.isDelivered
                                                    ? `✅ Delivered${result.deliveredAt ? ` on ${new Date(result.deliveredAt).toLocaleDateString()}` : ''}`
                                                    : result.error
                                                        ? `❌ ${result.error}`
                                                        : `⏳ ${result.status || 'In transit'}`
                                                }
                                            </div>
                                        )}
                                    </div>

                                    {/* Shipped Date */}
                                    <div style={{
                                        color: '#888',
                                        fontSize: '12px',
                                        textAlign: 'right'
                                    }}>
                                        <div>Shipped</div>
                                        <div>{new Date(order.shipped_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Links */}
            <div style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
                <Link
                    href="/admin/orders/ship-scan"
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#4ADE80',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        textDecoration: 'none'
                    }}
                >
                    📷 Scan & Ship
                </Link>
                <Link
                    href="/admin/orders/batch-sync"
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        color: '#60A5FA',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        textDecoration: 'none'
                    }}
                >
                    🔄 Sync Tracking
                </Link>
                <Link
                    href="/admin/orders"
                    style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        textDecoration: 'none'
                    }}
                >
                    📋 All Orders
                </Link>
            </div>
        </div>
    );
}
