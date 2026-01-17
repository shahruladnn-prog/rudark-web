'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Truck, Package, AlertTriangle } from 'lucide-react';

/**
 * Success animation overlay
 * Shows a brief animated confirmation after successful actions
 */

interface SuccessAnimationProps {
    type: 'shipped' | 'completed' | 'saved' | 'synced';
    message?: string;
    onComplete?: () => void;
}

const ICONS = {
    shipped: Truck,
    completed: CheckCircle,
    saved: CheckCircle,
    synced: Package,
};

const COLORS = {
    shipped: 'text-purple-400',
    completed: 'text-green-400',
    saved: 'text-rudark-volt',
    synced: 'text-blue-400',
};

const MESSAGES = {
    shipped: 'Order Shipped!',
    completed: 'Completed!',
    saved: 'Saved!',
    synced: 'Synced!',
};

export function SuccessAnimation({ type, message, onComplete }: SuccessAnimationProps) {
    const [visible, setVisible] = useState(true);
    const Icon = ICONS[type];
    const color = COLORS[type];
    const defaultMessage = MESSAGES[type];

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            onComplete?.();
        }, 1500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div
                className="bg-rudark-carbon/95 border border-rudark-grey rounded-sm p-8 flex flex-col items-center animate-success-pop"
                style={{
                    animation: 'successPop 0.3s ease-out forwards, successFade 1.5s ease-in forwards',
                }}
            >
                <div className={`${color} mb-3 animate-bounce`}>
                    <Icon size={48} />
                </div>
                <div className="text-white font-bold text-lg uppercase tracking-wide">
                    {message || defaultMessage}
                </div>
            </div>
        </div>
    );
}

/**
 * Hook to manage success animation state
 */
export function useSuccessAnimation() {
    const [animation, setAnimation] = useState<SuccessAnimationProps | null>(null);

    const showSuccess = (type: SuccessAnimationProps['type'], message?: string) => {
        setAnimation({ type, message, onComplete: () => setAnimation(null) });
    };

    const SuccessOverlay = animation ? (
        <SuccessAnimation {...animation} />
    ) : null;

    return { showSuccess, SuccessOverlay };
}

/**
 * Inline success indicator (checkmark that appears briefly)
 */
export function InlineSuccess({ show }: { show: boolean }) {
    if (!show) return null;

    return (
        <span className="inline-flex items-center gap-1 text-green-400 text-sm animate-pulse">
            <CheckCircle size={14} />
            Saved
        </span>
    );
}

/**
 * Button with loading and success states
 */
interface ActionButtonProps {
    onClick: () => Promise<void>;
    children: React.ReactNode;
    successType?: SuccessAnimationProps['type'];
    className?: string;
    disabled?: boolean;
}

export function ActionButton({
    onClick,
    children,
    successType = 'saved',
    className = '',
    disabled = false
}: ActionButtonProps) {
    const [loading, setLoading] = useState(false);
    const [showCheck, setShowCheck] = useState(false);

    const handleClick = async () => {
        if (loading || disabled) return;

        setLoading(true);
        try {
            await onClick();
            setShowCheck(true);
            setTimeout(() => setShowCheck(false), 2000);
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={loading || disabled}
            className={`relative ${className} ${loading ? 'opacity-70' : ''}`}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Processing...
                </span>
            ) : showCheck ? (
                <span className="flex items-center gap-2 text-green-400">
                    <CheckCircle size={16} />
                    Done!
                </span>
            ) : (
                children
            )}
        </button>
    );
}
