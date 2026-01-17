'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle, MessageSquare, RefreshCw, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/cart-context';
import { verifyOrderPayment } from '@/actions/manual-verify';

function SuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');
    const { clearCart } = useCart();

    // Status: idle, checking, paid, pending_check
    const [checkStatus, setCheckStatus] = useState('checking');
    const [statusMessage, setStatusMessage] = useState('Verifying payment status...');
    const clearedRef = useRef(false);

    const checkPayment = async (id: string) => {
        setCheckStatus('checking');
        setStatusMessage('Contacting payment gateway...');
        try {
            const result = await verifyOrderPayment(id);
            if (result.success && result.status === 'PAID') {
                setCheckStatus('paid');
                setStatusMessage('Payment Verified & Order Processed!');
            } else {
                setCheckStatus('pending_check');
                setStatusMessage('Payment confirmation pending. If you paid, click "Check Again".');
            }
        } catch (e) {
            setCheckStatus('error');
            setStatusMessage('Error checking status.');
        }
    };

    useEffect(() => {
        if (orderId) {
            if (!clearedRef.current) {
                clearCart();
                clearedRef.current = true;
            }
            // Auto check on mount
            checkPayment(orderId);
        }
    }, [orderId, clearCart]);

    if (!orderId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-rudark-matte text-white">
                <p className="font-mono text-red-500">[ERROR]: INVALID ORDER REFERENCE</p>
            </div>
        );
    }

    const whatsappMessage = `Hi RudArk, I just paid for Order #${orderId}. Can you check?`;
    const whatsappLink = `https://wa.me/60135518857?text=${encodeURIComponent(whatsappMessage)}`;

    return (
        <div className="min-h-screen bg-rudark-matte text-white flex flex-col items-center justify-center p-4">
            <div className={`bg-rudark-volt/10 p-8 rounded-full mb-8 border border-rudark-volt/30 ${checkStatus === 'checking' ? 'animate-pulse' : ''}`}>
                <CheckCircle className={`w-16 h-16 ${checkStatus === 'paid' ? 'text-green-500' : 'text-rudark-volt'}`} />
            </div>

            <h1 className="text-4xl md:text-5xl font-condensed font-bold text-white mb-2 uppercase tracking-wide">
                {checkStatus === 'paid' ? 'Order Confirmed' : 'Order Received'}
            </h1>
            <p className="text-rudark-volt font-mono mb-8 tracking-widest text-sm">REF: {orderId}</p>

            <div className="bg-rudark-carbon border border-rudark-grey p-6 rounded-sm max-w-md w-full mb-8 text-center text-gray-300">
                <div className="mb-4 flex flex-col items-center gap-2">
                    {checkStatus === 'checking' && <RefreshCw className="animate-spin text-rudark-volt" />}
                    {checkStatus === 'pending_check' && <AlertCircle className="text-yellow-500" />}
                    <span className={`font-bold ${checkStatus === 'paid' ? 'text-green-400' : checkStatus === 'pending_check' ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {statusMessage}
                    </span>

                    {checkStatus === 'pending_check' && (
                        <button
                            onClick={() => checkPayment(orderId)}
                            className="mt-2 text-xs bg-rudark-grey px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                        >
                            Check Again
                        </button>
                    )}
                </div>

                <p className="text-sm font-light text-gray-500 border-t border-gray-800 pt-4 mt-4">
                    Once verified, your tracking number will be generated automatically.
                </p>
            </div>

            <div className="space-y-4 w-full max-w-xs">
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-condensed font-bold py-4 px-6 rounded-sm transition-colors uppercase tracking-wider"
                >
                    <MessageSquare size={20} />
                    Confirm on WhatsApp
                </a>

                {checkStatus === 'paid' && (
                    <Link
                        href={`/orders/${orderId}`}
                        className="flex items-center justify-center w-full bg-rudark-volt hover:bg-rudark-volt/90 text-rudark-black font-condensed font-bold py-4 px-6 rounded-sm transition-colors uppercase tracking-wider"
                    >
                        View Order Status
                    </Link>
                )}

                <Link
                    href="/"
                    className="flex items-center justify-center w-full bg-transparent border border-rudark-grey hover:border-rudark-volt hover:text-rudark-volt text-gray-300 font-condensed font-bold py-4 px-6 rounded-sm transition-colors uppercase tracking-wider"
                >
                    Return to Base
                </Link>
            </div>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-rudark-matte text-white flex items-center justify-center">Loading Mission Data...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
