'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { adminDb } from '@/lib/firebase-admin';

export default function ManualPaymentPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (orderId) {
            // Fetch order details
            fetch(`/api/orders/${orderId}`)
                .then(res => res.json())
                .then(data => {
                    setOrder(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching order:', err);
                    setLoading(false);
                });
        }
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-rudark-matte flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-rudark-matte flex items-center justify-center">
                <div className="text-white">Order not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-rudark-carbon p-8 rounded-sm border border-rudark-grey">
                    <h1 className="text-3xl font-condensed font-bold mb-6 uppercase text-rudark-volt">
                        Manual Payment Instructions
                    </h1>

                    <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500 rounded-sm">
                        <p className="text-yellow-200 text-sm">
                            ⚠️ Your order has been created and is pending payment confirmation.
                        </p>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-2">Order Details</h2>
                        <div className="bg-rudark-matte p-4 rounded-sm">
                            <p><span className="text-gray-400">Order ID:</span> <span className="font-mono text-rudark-volt">{orderId}</span></p>
                            <p><span className="text-gray-400">Total Amount:</span> <span className="font-bold">RM {order.total_amount?.toFixed(2)}</span></p>
                            <p><span className="text-gray-400">Status:</span> <span className="text-yellow-400">Pending Payment</span></p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4">Payment Instructions</h2>
                        <div className="bg-rudark-matte p-6 rounded-sm whitespace-pre-line font-mono text-sm">
                            {order.payment_instructions?.replace('[ORDER_ID]', orderId || '')}
                        </div>
                    </div>

                    <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500 rounded-sm">
                        <h3 className="font-bold mb-2">Next Steps:</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Complete the payment using the details above</li>
                            <li>Keep your payment receipt/proof</li>
                            <li>Our team will verify your payment within 24 hours</li>
                            <li>You'll receive an email confirmation once approved</li>
                        </ol>
                    </div>

                    <div className="flex gap-4">
                        <a
                            href="/"
                            className="flex-1 bg-rudark-matte border border-rudark-grey text-white p-4 text-center font-bold rounded-sm hover:border-rudark-volt transition-colors"
                        >
                            Back to Home
                        </a>
                        <a
                            href={`/order-tracking?order_id=${orderId}`}
                            className="flex-1 bg-rudark-volt text-black p-4 text-center font-bold rounded-sm hover:bg-white transition-colors"
                        >
                            Track Order
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
