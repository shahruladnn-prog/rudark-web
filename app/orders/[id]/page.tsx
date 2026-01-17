'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function OrderStatusPage() {
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        const orderId = Array.isArray(id) ? id[0] : id;

        // Real-time listener for status updates (e.g. when webhook fires)
        const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
            if (doc.exists()) {
                setOrder(doc.data());
            } else {
                setOrder(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Loading Order Details...</div>;
    if (!order) return <div className="p-10 text-center text-red-500">Order not found.</div>;

    const validStatuses = ['PAID', 'AWAITING_PICKUP', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
    const isPaid = validStatuses.includes(order.status);
    const trackingNumber = order.tracking_no;

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
                            <span className={`inline-block px-4 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${isPaid ? 'bg-green-600 text-white' : 'bg-yellow-500 text-black'}`}>
                                {order.status}
                            </span>
                        </div>
                    </div>

                    {isPaid && trackingNumber && trackingNumber !== 'PENDING' && (
                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <p className="text-xs text-gray-400 uppercase font-bold mb-1">Tracking Number</p>
                            <p className="text-2xl font-mono font-bold text-white">{trackingNumber}</p>
                            <p className="text-xs text-gray-500 mt-1">Courier: J&T Express</p>
                            <p className="text-[10px] text-gray-500 mt-2 italic">Please allow up to 24 hours for tracking to be updated.</p>
                        </div>
                    )}
                    {isPaid && (!trackingNumber || trackingNumber === 'PENDING') && (
                        <div className="mt-6 pt-6 border-t border-gray-800">
                            <p className="text-sm text-rudark-volt font-mono mb-1 animate-pulse">Generating Shipment...</p>
                            <p className="text-[10px] text-gray-500 mt-2">Please allow up to 24 hours for tracking to be updated.</p>
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
                                <span>Shipping</span>
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
