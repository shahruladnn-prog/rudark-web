'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
    getOrderByTrackingNo,
    processReturn,
    getReturnedOrders
} from '@/actions/parcelasia-sync';

interface OrderData {
    id: string;
    tracking_no: string;
    parcelasia_shipment_id?: string;
    customer?: {
        name: string;
        phone: string;
        email: string;
    };
    status: string;
    items?: any[];
    total_amount: number;
}

interface ReturnedOrder {
    id: string;
    customer_name: string;
    returned_at: string;
    return_reason: string;
    items_restocked: boolean;
}

export default function ReturnsPage() {
    const [trackingInput, setTrackingInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<OrderData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [returnReason, setReturnReason] = useState('');
    const [shouldRestock, setShouldRestock] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [returnedOrders, setReturnedOrders] = useState<ReturnedOrder[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on load
    useEffect(() => {
        inputRef.current?.focus();
        loadReturnedOrders();
    }, []);

    // Load returned orders history
    async function loadReturnedOrders() {
        try {
            const result = await getReturnedOrders();
            if (result.success) {
                setReturnedOrders(result.orders);
            }
        } catch (err) {
            console.error('Failed to load returned orders');
        }
    }

    // Lookup order by tracking number
    async function handleLookup(tracking?: string) {
        const value = tracking || trackingInput.trim();
        if (!value) return;

        setLoading(true);
        setError(null);
        setSuccess(null);
        setOrder(null);

        try {
            const result = await getOrderByTrackingNo(value);

            if (result.success && result.order) {
                setOrder(result.order);
            } else {
                setError(result.error || 'Order not found');
            }
        } catch (err) {
            setError('Failed to lookup order');
        } finally {
            setLoading(false);
        }
    }

    // Handle keyboard submit
    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLookup();
        }
    }

    // Process the return
    async function handleProcessReturn() {
        if (!order?.id) return;

        setShowConfirmModal(false);
        setLoading(true);
        setError(null);

        try {
            const result = await processReturn(order.id, returnReason, shouldRestock);

            if (result.success) {
                setSuccess(
                    `Order marked as RETURNED!` +
                    (shouldRestock ? ` ${result.itemsRestocked || 0} items restocked.` : '')
                );
                setOrder({ ...order, status: 'RETURNED' });
                setReturnReason('');
                loadReturnedOrders();
            } else {
                setError(result.error || 'Failed to process return');
            }
        } catch (err) {
            setError('Failed to process return');
        } finally {
            setLoading(false);
        }
    }

    // Clear form
    function clearForm() {
        setTrackingInput('');
        setOrder(null);
        setError(null);
        setSuccess(null);
        setReturnReason('');
        inputRef.current?.focus();
    }

    const canReturn = order && ['SHIPPED', 'DELIVERED'].includes(order.status);
    const alreadyReturned = order?.status === 'RETURNED';

    return (
        <div className="admin-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div className="admin-header">
                <Link href="/admin/orders" className="back-link">← Back to Orders</Link>
                <h1>📦 Returns & Exchanges</h1>
                <p className="subtitle">Process returned orders and restock inventory</p>
            </div>

            {/* Info Box */}
            <div style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
            }}>
                <div style={{ color: '#FACC15', fontWeight: 'bold', marginBottom: '8px' }}>
                    ℹ️ How it works
                </div>
                <ul style={{ color: '#94A3B8', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
                    <li>Scan or enter tracking number of returned parcel</li>
                    <li>Verify order details and items</li>
                    <li>Choose to restock inventory or not</li>
                    <li>Confirm return to update status and restock</li>
                </ul>
            </div>

            {/* Input Section */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter tracking number..."
                        style={{
                            flex: 1,
                            padding: '16px',
                            fontSize: '18px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            fontFamily: 'monospace'
                        }}
                    />
                    <button
                        onClick={() => handleLookup()}
                        disabled={loading || !trackingInput}
                        style={{
                            padding: '16px 24px',
                            background: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        {loading ? '...' : '🔍'}
                    </button>
                </div>
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

            {/* Success Display */}
            {success && (
                <div style={{
                    padding: '16px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    color: '#4ADE80',
                    fontWeight: 'bold'
                }}>
                    ✅ {success}
                </div>
            )}

            {/* Order Details */}
            {order && (
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>ORDER ID</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22D3EE' }}>{order.id}</div>
                        </div>
                        <div style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: alreadyReturned ? 'rgba(168, 85, 247, 0.2)' :
                                canReturn ? 'rgba(34, 197, 94, 0.2)' :
                                    'rgba(100, 100, 100, 0.2)',
                            color: alreadyReturned ? '#C084FC' :
                                canReturn ? '#4ADE80' :
                                    '#888',
                            fontWeight: 'bold',
                            fontSize: '12px'
                        }}>
                            {order.status}
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>CUSTOMER</div>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>{order.customer?.name || 'N/A'}</div>
                    </div>

                    {/* Items */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>ITEMS TO RESTOCK</div>
                        {order.items?.map((item: any, i: number) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                marginBottom: '8px'
                            }}>
                                <span style={{ color: 'white' }}>{item.name}</span>
                                <span style={{
                                    color: '#22D3EE',
                                    fontWeight: 'bold',
                                    background: 'rgba(34, 211, 238, 0.1)',
                                    padding: '4px 10px',
                                    borderRadius: '12px'
                                }}>
                                    ×{item.quantity}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Return Actions */}
                    {canReturn && !alreadyReturned && (
                        <>
                            {/* Return Reason */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>RETURN REASON (optional)</div>
                                <select
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select reason...</option>
                                    <option value="Customer request">Customer request</option>
                                    <option value="Wrong item">Wrong item</option>
                                    <option value="Defective product">Defective product</option>
                                    <option value="Wrong size">Wrong size</option>
                                    <option value="Undeliverable">Undeliverable / Return to sender</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Restock Toggle */}
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                background: shouldRestock ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                                border: shouldRestock ? '2px solid rgba(34, 197, 94, 0.3)' : '2px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                marginBottom: '16px',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={shouldRestock}
                                    onChange={(e) => setShouldRestock(e.target.checked)}
                                    style={{ width: '20px', height: '20px' }}
                                />
                                <div>
                                    <div style={{ color: 'white', fontWeight: 'bold' }}>Restock Inventory</div>
                                    <div style={{ color: '#888', fontSize: '12px' }}>
                                        Add items back to Loyverse inventory
                                    </div>
                                </div>
                            </label>

                            {/* Process Button */}
                            <button
                                onClick={() => setShowConfirmModal(true)}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
                                }}
                            >
                                📦 Process Return
                            </button>
                        </>
                    )}

                    {alreadyReturned && (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#C084FC',
                            fontWeight: 'bold'
                        }}>
                            ✓ This order has already been returned
                        </div>
                    )}

                    {!canReturn && !alreadyReturned && (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#F87171'
                        }}>
                            Cannot process return - Order status is {order.status}
                            <br />
                            <span style={{ fontSize: '12px', color: '#888' }}>
                                Only SHIPPED or DELIVERED orders can be returned
                            </span>
                        </div>
                    )}

                    {/* Clear Button */}
                    <button
                        onClick={clearForm}
                        style={{
                            width: '100%',
                            marginTop: '16px',
                            padding: '12px',
                            background: 'transparent',
                            color: '#888',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear & Scan Next
                    </button>
                </div>
            )}

            {/* Returned Orders History */}
            {returnedOrders.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <h2 style={{ color: 'white', fontSize: '18px', marginBottom: '12px' }}>
                        📜 Recent Returns ({returnedOrders.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {returnedOrders.slice(0, 5).map((order) => (
                            <div
                                key={order.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px'
                                }}
                            >
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(168, 85, 247, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#C084FC'
                                }}>
                                    ↩
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: 'white' }}>{order.customer_name}</div>
                                    <div style={{ color: '#888', fontSize: '12px' }}>
                                        {order.return_reason}
                                        {order.items_restocked && ' • Restocked'}
                                    </div>
                                </div>
                                <div style={{ color: '#888', fontSize: '12px' }}>
                                    {new Date(order.returned_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Links */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '32px',
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
                    📷 Ship Scan
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

            {/* Confirmation Modal */}
            {showConfirmModal && order && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 100
                    }}
                    onClick={() => setShowConfirmModal(false)}
                >
                    <div
                        style={{
                            background: '#1a1a2e',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '100%',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '8px' }}>⚠️</div>
                            <h2 style={{ color: 'white', fontSize: '20px', margin: 0 }}>
                                Confirm Return
                            </h2>
                        </div>

                        <div style={{
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ color: '#888', fontSize: '12px' }}>Order</div>
                            <div style={{ color: 'white', fontWeight: 'bold' }}>{order.id}</div>
                            <div style={{ color: '#888', marginTop: '8px', fontSize: '12px' }}>Customer</div>
                            <div style={{ color: 'white' }}>{order.customer?.name}</div>
                            <div style={{ color: '#888', marginTop: '8px', fontSize: '12px' }}>Reason</div>
                            <div style={{ color: '#FACC15' }}>{returnReason || 'No reason specified'}</div>
                            <div style={{ color: '#888', marginTop: '8px', fontSize: '12px' }}>Restock</div>
                            <div style={{ color: shouldRestock ? '#4ADE80' : '#F87171' }}>
                                {shouldRestock ? 'Yes - Items will be added back' : 'No - Items will not be restocked'}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: '#888',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProcessReturn}
                                disabled={loading}
                                style={{
                                    flex: 2,
                                    padding: '14px',
                                    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
                                }}
                            >
                                {loading ? 'Processing...' : 'Confirm Return'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
