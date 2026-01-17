'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    getOrdersNeedingSync,
    batchSyncTracking,
    syncOrderTracking
} from '@/actions/parcelasia-sync';

interface OrderToSync {
    id: string;
    parcelasia_shipment_id: string;
    customer_name: string;
    created_at: string;
}

interface SyncResult {
    success: boolean;
    orderId: string;
    tracking_no?: string;
    error?: string;
}

export default function BatchSyncPage() {
    const [orders, setOrders] = useState<OrderToSync[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState<SyncResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Load orders needing sync
    useEffect(() => {
        loadOrders();
    }, []);

    async function loadOrders() {
        setLoading(true);
        setError(null);
        try {
            const result = await getOrdersNeedingSync();
            if (result.success) {
                setOrders(result.orders);
            } else {
                setError(result.error || 'Failed to load orders');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleBatchSync() {
        if (!confirm(`Sync tracking for ${orders.length} orders?\n\nMake sure you have checked out these orders in MyParcelAsia portal first.`)) {
            return;
        }

        setSyncing(true);
        setResults([]);
        setError(null);

        try {
            const result = await batchSyncTracking();
            setResults(result.results);

            // Reload orders to refresh the list
            await loadOrders();

            if (result.failed > 0) {
                setError(`${result.failed} orders failed to sync. See details below.`);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSyncing(false);
        }
    }

    async function handleSingleSync(orderId: string) {
        setSyncing(true);
        try {
            const result = await syncOrderTracking(orderId);
            setResults(prev => [result, ...prev.filter(r => r.orderId !== orderId)]);

            if (result.success) {
                // Remove from list
                setOrders(prev => prev.filter(o => o.id !== orderId));
            }
        } catch (err: any) {
            setResults(prev => [{
                success: false,
                orderId,
                error: err.message
            }, ...prev]);
        } finally {
            setSyncing(false);
        }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return (
        <div className="admin-container">
            <div className="admin-header">
                <div>
                    <Link href="/admin/orders" className="back-link">← Back to Orders</Link>
                    <h1>Sync Tracking Numbers</h1>
                    <p className="subtitle">
                        Pull real tracking numbers from ParcelAsia after manual checkout
                    </p>
                </div>
            </div>

            {/* Instructions */}
            <div className="info-box" style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
            }}>
                <h3 style={{ color: '#60A5FA', marginBottom: '8px' }}>📋 How to Use</h3>
                <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Checkout orders in <a href="https://app.myparcelasia.com" target="_blank" rel="noopener" style={{ color: '#60A5FA' }}>MyParcelAsia Portal</a></li>
                    <li>Come back here and click <strong>Sync All</strong></li>
                    <li>Real tracking numbers will be pulled from ParcelAsia</li>
                </ol>
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-box" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '24px',
                    color: '#F87171'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Results Summary */}
            {results.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '8px',
                        padding: '16px',
                        flex: 1,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#22C55E' }}>{successCount}</div>
                        <div style={{ color: '#86EFAC' }}>Synced</div>
                    </div>
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '16px',
                        flex: 1,
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#EF4444' }}>{failCount}</div>
                        <div style={{ color: '#FCA5A5' }}>Failed</div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button
                    onClick={handleBatchSync}
                    disabled={syncing || orders.length === 0}
                    className="btn-primary"
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        opacity: syncing || orders.length === 0 ? 0.5 : 1
                    }}
                >
                    {syncing ? '⏳ Syncing...' : `🔄 Sync All (${orders.length})`}
                </button>
                <button
                    onClick={loadOrders}
                    disabled={loading || syncing}
                    className="btn-secondary"
                    style={{ padding: '12px 24px' }}
                >
                    ↻ Refresh
                </button>
            </div>

            {/* Orders List */}
            <div className="card">
                <h2 style={{ marginBottom: '16px' }}>Orders Needing Sync</h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        Loading orders...
                    </div>
                ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        ✅ All orders are synced! No orders pending.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Shipment ID</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const result = results.find(r => r.orderId === order.id);
                                return (
                                    <tr key={order.id}>
                                        <td>
                                            <Link href={`/admin/orders/${order.id}`} style={{ color: '#60A5FA' }}>
                                                {order.id}
                                            </Link>
                                        </td>
                                        <td>{order.customer_name}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                            {order.parcelasia_shipment_id?.substring(0, 12)}...
                                        </td>
                                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {result ? (
                                                result.success ? (
                                                    <span style={{ color: '#22C55E' }}>
                                                        ✅ {result.tracking_no}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#EF4444', fontSize: '12px' }}>
                                                        ❌ {result.error}
                                                    </span>
                                                )
                                            ) : (
                                                <button
                                                    onClick={() => handleSingleSync(order.id)}
                                                    disabled={syncing}
                                                    className="btn-small"
                                                >
                                                    Sync
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Sync Results Log */}
            {results.length > 0 && (
                <div className="card" style={{ marginTop: '24px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Sync Results</h2>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {results.map((result, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '8px 12px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{ fontFamily: 'monospace' }}>{result.orderId}</span>
                                {result.success ? (
                                    <span style={{ color: '#22C55E' }}>
                                        ✅ {result.tracking_no}
                                    </span>
                                ) : (
                                    <span style={{ color: '#EF4444', fontSize: '12px' }}>
                                        ❌ {result.error}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                .btn-primary {
                    background: linear-gradient(135deg, #22C55E, #16A34A);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                }
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                }
                .btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    cursor: pointer;
                }
                .btn-small {
                    background: rgba(59, 130, 246, 0.2);
                    color: #60A5FA;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 4px;
                    padding: 4px 12px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .card {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 24px;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .data-table th,
                .data-table td {
                    text-align: left;
                    padding: 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .data-table th {
                    color: #888;
                    font-weight: 500;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                .back-link {
                    color: #888;
                    text-decoration: none;
                    font-size: 14px;
                }
                .back-link:hover {
                    color: #fff;
                }
                .subtitle {
                    color: #888;
                    margin-top: 4px;
                }
            `}</style>
        </div>
    );
}
