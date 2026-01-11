'use client';

import { useEffect, useState } from 'react';
import { getShippingSettings } from '@/actions/shipping-settings-actions';
import { ShippingSettings } from '@/types/shipping-settings';

interface FreeShippingProgressProps {
    subtotal: number;
    className?: string;
}

export default function FreeShippingProgress({ subtotal, className = '' }: FreeShippingProgressProps) {
    const [settings, setSettings] = useState<ShippingSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await getShippingSettings();
            setSettings(data);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    if (loading || !settings || !settings.free_shipping_enabled) {
        return null; // Don't show if disabled or loading
    }

    const threshold = settings.free_shipping_threshold;
    const remaining = Math.max(0, threshold - subtotal);
    const progress = Math.min(100, (subtotal / threshold) * 100);
    const qualified = subtotal >= threshold;

    return (
        <div className={`bg-rudark-charcoal border-2 ${qualified ? 'border-green-500' : 'border-rudark-volt'} rounded-lg p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">{qualified ? '✅' : '🚚'}</span>
                    <h3 className="font-condensed font-bold text-white text-lg">
                        {qualified ? 'FREE SHIPPING UNLOCKED!' : 'FREE SHIPPING'}
                    </h3>
                </div>
                {!qualified && (
                    <span className="text-rudark-volt font-condensed font-bold">
                        RM {remaining.toFixed(2)} away
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-3 bg-rudark-matte rounded-full overflow-hidden mb-2">
                <div
                    className={`absolute top-0 left-0 h-full transition-all duration-500 ${qualified ? 'bg-green-500' : 'bg-rudark-volt'
                        }`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Message */}
            <p className="text-sm text-gray-300">
                {qualified ? (
                    <span className="text-green-400 font-medium">
                        🎉 You qualify for free shipping!
                    </span>
                ) : (
                    <>
                        Add <span className="text-rudark-volt font-bold">RM {remaining.toFixed(2)}</span> more to get{' '}
                        <span className="text-white font-bold">FREE SHIPPING</span>
                    </>
                )}
            </p>

            {/* Threshold Info */}
            <p className="text-xs text-gray-500 mt-2">
                Free shipping on orders over RM {threshold.toFixed(2)}
            </p>
        </div>
    );
}
