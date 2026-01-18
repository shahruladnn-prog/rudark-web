'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPublicOrderStatus } from '@/actions/public-order-actions';

export default function OrderStatusPage() {
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const orderId = Array.isArray(id) ? id[0] : id;

        // Fetch order via Server Action (Admin SDK, bypasses security rules)
        const fetchOrder = async () => {
            try {
                const result = await getPublicOrderStatus(orderId);
                if (result.success && result.order) {
                    setOrder(result.order);
                } else {
                    setError(result.error || 'Order not found');
                }
            } catch (err) {
                console.error('Failed to fetch order:', err);
                setError('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();

        // Optional: Poll for updates every 10 seconds (for tracking number updates)
        const interval = setInterval(fetchOrder, 10000);
        return () => clearInterval(interval);
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-rudark-volt border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-400">Loading Order Details...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-500 text-xl mb-4">{error}</p>
                <Link href="/" className="text-rudark-volt hover:underline">
                    Return to Home
                </Link>
            </div>
        </div>
    );

    if (!order) return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-500 text-xl mb-4">Order not found.</p>
                <Link href="/" className="text-rudark-volt hover:underline">
                    Return to Home
                </Link>
            </div>
        </div>
    );

    const validStatuses = ['PAID', 'AWAITING_PICKUP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'READY_FOR_COLLECTION'];
    const isPaid = validStatuses.includes(order.status);
    const trackingNumber = order.tracking_no;
    const isSelfCollection = order.delivery_method === 'self_collection';

    // Status styling
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID':
            case 'AWAITING_PICKUP':
                return 'bg-green-600 text-white';
            case 'SHIPPED':
                return 'bg-blue-600 text-white';
            case 'DELIVERED':
            case 'COMPLETED':
                return 'bg-emerald-600 text-white';
            case 'READY_FOR_COLLECTION':
                return 'bg-purple-600 text-white';
            case 'PENDING':
                return 'bg-yellow-500 text-black';
            case 'PAYMENT_FAILED':
            case 'SHIPMENT_FAILED':
                return 'bg-red-600 text-white';
            default:
                return 'bg-gray-600 text-white';
        }
    };

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-condensed font-bold mb-6 uppercase text-white">Order Status</h1>

                <div className="bg-rudark-carbon border border-rudark-grey p-6 rounded-sm mb-8 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="text-xs text-rudark-volt uppercase font-bold tracking-wider mb-1">Order ID</p>
                            <p className="text-xl font-mono font-bold text-white">{order.id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-rudark-volt uppercase font-bold tracking-wider mb-1">Status</p>
                            <span className={`inline-block px-4 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                                {order.status?.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>

                    {/* Tracking Section */}
                    {isPaid && !isSelfCollection && trackingNumber && trackingNumber !== 'PENDING' && trackingNumber !== 'N/A' && (
                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Tracking Number</p>
                            <p className="text-2xl font-mono font-bold text-white">{trackingNumber}</p>
                            <p className="text-xs text-gray-500 mt-1">Courier: {order.shipping_provider === 'jnt' ? 'J&T Express' : order.shipping_provider?.toUpperCase()}</p>
                            <a
                                href={`https://myparcelasia.com/track/${trackingNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-3 px-4 py-2 bg-rudark-volt text-black text-xs font-bold uppercase rounded hover:bg-opacity-90 transition"
                            >
                                Track Parcel →
                            </a>
                        </div>
                    )}

                    {isPaid && !isSelfCollection && (!trackingNumber || trackingNumber === 'PENDING') && (
                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <p className="text-sm text-rudark-volt font-mono mb-1 animate-pulse">Generating Tracking Number...</p>
                            <p className="text-[10px] text-gray-500 mt-2">Please allow up to 24 hours for tracking to be updated.</p>
                        </div>
                    )}

                    {isSelfCollection && (
                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Collection Point</p>
                            <p className="text-lg font-bold text-white">Rudark HQ</p>
                            <p className="text-sm text-gray-400 mt-1">Lot 10846, Jalan Besar Kampung Chulek, 31600 Gopeng, Perak</p>
                            <p className="text-xs text-rudark-volt mt-2">Please bring your Order ID for collection</p>
                        </div>
                    )}
                </div>

                <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-6 shadow-lg">
                    <h2 className="text-xl font-condensed font-bold mb-6 text-white uppercase">Order Details</h2>
                    <div className="space-y-4">
                        {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center border-b border-gray-800 pb-4 last:border-0">
                                <div>
                                    <p className="font-bold text-white uppercase text-sm">{item.name}</p>
                                    {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                        <p className="text-xs text-gray-500 font-mono">
                                            {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 font-mono">Qty: {item.quantity}</p>
                                </div>
                                <p className="font-mono text-sm text-gray-300">RM {(item.web_price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}

                        <div className="pt-4 border-t border-gray-800 mt-4 space-y-2">
                            <div className="flex justify-between text-gray-400 text-sm">
                                <span>Subtotal</span>
                                <span className="font-mono">RM {order.subtotal?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-sm">
                                <span>{isSelfCollection ? 'Collection Fee' : 'Shipping'}</span>
                                <span className="font-mono">RM {order.shipping_cost?.toFixed(2)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between text-rudark-volt text-sm">
                                    <span>Discount</span>
                                    <span className="font-mono">- RM {order.discount_amount?.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold mt-4 pt-4 border-t border-gray-800 text-white">
                                <span className="font-condensed uppercase">Total</span>
                                <span className="font-mono text-rudark-volt">RM {order.total_amount?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <Link href="/" className="text-gray-500 hover:text-white transition-colors text-sm font-mono uppercase tracking-widest">
                        &larr; Return to Base
                    </Link>
                </div>
            </div>
        </div>
    );
}
