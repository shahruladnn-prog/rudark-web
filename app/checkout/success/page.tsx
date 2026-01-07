'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, MessageSquare } from 'lucide-react';
import { useCart } from '@/context/cart-context';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');
    const { clearCart } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (orderId) {
            clearCart();
        }
    }, [orderId, clearCart]);

    if (!mounted) return null;

    if (!orderId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-rudark-matte text-white">
                <p className="font-mono text-red-500">[ERROR]: INVALID ORDER REFERENCE</p>
            </div>
        );
    }

    const whatsappMessage = `Hi RudArk, I just paid for Order #${orderId}. Can you check?`;
    const whatsappLink = `https://wa.me/60123456789?text=${encodeURIComponent(whatsappMessage)}`;

    return (
        <div className="min-h-screen bg-rudark-matte text-white flex flex-col items-center justify-center p-4">
            <div className="bg-rudark-volt/10 p-8 rounded-full mb-8 border border-rudark-volt/30 animate-pulse">
                <CheckCircle className="w-16 h-16 text-rudark-volt" />
            </div>

            <h1 className="text-4xl md:text-5xl font-condensed font-bold text-white mb-2 uppercase tracking-wide">Order Confirmed</h1>
            <p className="text-rudark-volt font-mono mb-8 tracking-widest text-sm">REF: {orderId}</p>

            <div className="bg-rudark-carbon border border-rudark-grey p-8 rounded-sm max-w-md w-full mb-8 text-center text-gray-300">
                <p className="mb-4 text-lg">Mission approved.</p>
                <p className="text-sm font-light text-gray-500">
                    We have received your requisition details and payment confirmation.
                    Stand by for shipping notification.
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
