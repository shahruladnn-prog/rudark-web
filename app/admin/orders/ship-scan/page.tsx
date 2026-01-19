'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    getOrderByTrackingNo,
    markOrderShipped,
    markOrderCancelled,
    generateWhatsAppLink
} from '@/actions/parcelasia-sync';

// Dynamic import for html5-qrcode (client-side only)
let Html5Qrcode: any = null;
if (typeof window !== 'undefined') {
    import('html5-qrcode').then((module) => {
        Html5Qrcode = module.Html5Qrcode;
    });
}

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
    shipping_status: string;
    items?: any[];
    total_amount: number;
}

export default function ShipScanPage() {
    const [trackingInput, setTrackingInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [order, setOrder] = useState<OrderData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [scannerActive, setScannerActive] = useState(false);
    const [scannerReady, setScannerReady] = useState(false);

    // WhatsApp Prompt state
    const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);

    // Packing checklist state
    const [showPackingChecklist, setShowPackingChecklist] = useState(false);
    const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({});

    const inputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<any>(null);
    const scannerContainerId = 'qr-scanner-container';

    // Auto-focus input on load
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    // Handle successful scan
    const onScanSuccess = useCallback((decodedText: string) => {
        console.log('[Scanner] Detected:', decodedText);

        // Play success beep
        playSound('beep');

        // Vibrate
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }

        // Stop scanner and lookup order
        stopScanner();
        setTrackingInput(decodedText);
        handleLookup(decodedText);
    }, []);

    // Lookup order by tracking number
    async function handleLookup(tracking?: string) {
        const value = tracking || trackingInput.trim();
        if (!value) return;

        setLoading(true);
        setError(null);
        setSuccess(null);
        setOrder(null);
        setShowWhatsAppPrompt(false); // Reset prompt

        try {
            const result = await getOrderByTrackingNo(value);

            if (result.success && result.order) {
                setOrder(result.order);
                playSound('success');
            } else {
                setError(result.error || 'Order not found');
                playSound('error');
            }
        } catch (err: any) {
            setError('Failed to lookup order: ' + (err?.message || String(err)));
            playSound('error');
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

    // Open packing checklist before shipping
    function openPackingChecklist() {
        if (!order?.items?.length) {
            // No items to check, ship directly
            handleShip();
            return;
        }
        // Reset checked items
        setCheckedItems({});
        setShowPackingChecklist(true);
    }

    // Toggle item in checklist
    function toggleItemChecked(index: number) {
        setCheckedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    }

    // Check if all items are checked
    const allItemsChecked = order?.items?.every((_, i) => checkedItems[i]) ?? false;

    // Mark as shipped (called after checklist confirmation)
    async function handleShip() {
        if (!order?.id) return;

        setShowPackingChecklist(false);
        setLoading(true);
        setError(null);

        try {
            const result = await markOrderShipped(order.id);

            if (result.success) {
                setSuccess('Order marked as SHIPPED!');
                playSound('success');

                // Update local state
                setOrder({ ...order, status: 'SHIPPED', shipping_status: 'SHIPPED' });

                // Show WhatsApp prompt instead of auto-clearing
                setShowWhatsAppPrompt(true);
            } else {
                setError(result.error || 'Failed to update order');
                playSound('error');
            }
        } catch (err) {
            setError('Failed to mark as shipped');
            playSound('error');
        } finally {
            setLoading(false);
        }
    }

    // Mark as cancelled
    async function handleCancel() {
        if (!order?.id) return;

        setLoading(true);
        setError(null);

        try {
            const result = await markOrderCancelled(order.id, 'Cancelled via scan');

            if (result.success) {
                setSuccess('Order marked as CANCELLED');
                playSound('success');
                setOrder({ ...order, status: 'CANCELLED' });
            } else {
                setError(result.error || 'Failed to cancel order');
                playSound('error');
            }
        } catch (err) {
            setError('Failed to cancel order');
            playSound('error');
        } finally {
            setLoading(false);
        }
    }

    // Open WhatsApp with beautiful message
    async function handleWhatsApp() {
        if (!order?.customer?.phone || !order?.tracking_no) return;

        const items = (order.items || []).map((item: any) => ({
            name: item.name,
            quantity: item.quantity
        }));

        const url = await generateWhatsAppLink(
            order.customer.phone,
            order.id,
            order.tracking_no,
            order.customer.name,
            items,
            "Rud'Ark ProShop"
        );
        window.open(url, '_blank');
    }

    // Clear form and reset for next scan
    function clearAndReset() {
        setTrackingInput('');
        setOrder(null);
        setError(null);
        setSuccess(null);
        inputRef.current?.focus();
    }

    // Play audio feedback
    function playSound(type: 'success' | 'error' | 'beep') {
        try {
            // Create audio context for better mobile support
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'success') {
                oscillator.frequency.value = 880; // A5 note
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;
            } else if (type === 'beep') {
                oscillator.frequency.value = 1200;
                oscillator.type = 'square';
                gainNode.gain.value = 0.2;
            } else {
                oscillator.frequency.value = 220; // A3 note
                oscillator.type = 'sawtooth';
                gainNode.gain.value = 0.3;
            }

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
        } catch {
            // Silently fail if audio not supported
        }

        // Vibrate on mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(type === 'success' ? 100 : type === 'beep' ? 50 : [100, 50, 100]);
        }
    }

    // Start barcode scanner
    async function startScanner() {
        if (!Html5Qrcode) {
            // Try loading again
            try {
                const module = await import('html5-qrcode');
                Html5Qrcode = module.Html5Qrcode;
            } catch (e) {
                setError('Failed to load scanner library');
                return;
            }
        }

        try {
            scannerRef.current = new Html5Qrcode(scannerContainerId);

            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 100 },
                    aspectRatio: 1.777778
                },
                onScanSuccess,
                () => { } // Ignore scan failures (no barcode in frame)
            );

            setScannerActive(true);
            setScannerReady(true);
        } catch (err: any) {
            console.error('[Scanner] Error:', err);
            if (err.message?.includes('Permission')) {
                setError('Camera permission denied. Please allow camera access or use manual entry.');
            } else {
                setError('Failed to start camera. ' + (err.message || ''));
            }
            setScannerActive(false);
            setScannerReady(false);
        }
    }

    // Stop barcode scanner
    async function stopScanner() {
        if (scannerRef.current && scannerActive) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch (e) {
                console.error('[Scanner] Stop error:', e);
            }
        }
        setScannerActive(false);
        setScannerReady(false);
    }

    // Toggle scanner
    async function toggleScanner() {
        if (scannerActive) {
            await stopScanner();
        } else {
            await startScanner();
        }
    }

    const isShippable = order && ['PAID', 'READY_TO_SHIP', 'AWAITING_PICKUP'].includes(order.status);
    const isAlreadyShipped = order?.status === 'SHIPPED';
    const isCancelled = order?.status === 'CANCELLED';

    return (
        <div className="admin-container" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="admin-header">
                <Link href="/admin/orders" className="back-link">← Back to Orders</Link>
                <h1>📦 SHIP ORDER SCANNER</h1>
                <p className="subtitle">Scan barcode or enter tracking number to mark as shipped</p>
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
                        placeholder="Enter or scan tracking number..."
                        className="input-large"
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

                {/* Native Camera Capture - More reliable on mobile */}
                <div style={{ marginBottom: '12px' }}>
                    <label
                        htmlFor="camera-input"
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                            color: '#60A5FA',
                            border: '2px solid rgba(59, 130, 246, 0.4)',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            textAlign: 'center'
                        }}
                    >
                        📸 Take Photo of Tracking Label (Recommended for Mobile)
                    </label>
                    <input
                        id="camera-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setLoading(true);
                            setError(null);

                            try {
                                // Try to use BarcodeDetector API (available in Chrome/Edge)
                                if ('BarcodeDetector' in window) {
                                    const barcodeDetector = new (window as any).BarcodeDetector({
                                        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code']
                                    });

                                    const img = new Image();
                                    img.src = URL.createObjectURL(file);
                                    await new Promise((resolve) => { img.onload = resolve; });

                                    const barcodes = await barcodeDetector.detect(img);
                                    if (barcodes.length > 0) {
                                        const tracking = barcodes[0].rawValue;
                                        playSound('beep');
                                        setTrackingInput(tracking);
                                        handleLookup(tracking);
                                    } else {
                                        setError('No barcode detected in image. Try again or enter manually.');
                                    }
                                } else {
                                    // Fallback: Ask user to enter manually
                                    setError('Barcode detection not supported in this browser. Please enter the tracking number manually.');
                                }
                            } catch (err: any) {
                                console.error('Barcode detection error:', err);
                                setError('Failed to detect barcode: ' + err.message);
                            } finally {
                                setLoading(false);
                                e.target.value = ''; // Reset input
                            }
                        }}
                    />
                    <p style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.5)',
                        textAlign: 'center',
                        marginTop: '8px'
                    }}>
                        Works best with clear, close-up photos
                    </p>
                </div>

                {/* Camera Scanner Toggle - html5-qrcode (Desktop/Some browsers) */}
                <button
                    onClick={toggleScanner}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: scannerActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                        color: scannerActive ? '#F87171' : '#4ADE80',
                        border: `1px solid ${scannerActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    {scannerActive ? (
                        <>❌ Close Live Scanner</>
                    ) : (
                        <>📷 Live Camera Scanner (Desktop)</>
                    )}
                </button>
            </div>


            {/* Camera Scanner Container */}
            <div
                id={scannerContainerId}
                style={{
                    display: scannerActive ? 'block' : 'none',
                    width: '100%',
                    height: scannerActive ? '300px' : '0',
                    minHeight: scannerActive ? '300px' : '0',
                    marginBottom: '24px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#000',
                    position: 'relative'
                }}
            />

            {/* Scanner Status */}
            {scannerActive && (
                <div style={{
                    textAlign: 'center',
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                    <span style={{ color: '#4ADE80', fontWeight: 'bold' }}>
                        📸 Camera Active - Point at barcode
                    </span>
                </div>
            )}

            {/* Status Messages */}
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

            {/* Order Result */}
            {order && (
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>ORDER ID</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22D3EE' }}>{order.id}</div>
                        </div>
                        <div style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: isAlreadyShipped ? 'rgba(34, 197, 94, 0.2)' :
                                isCancelled ? 'rgba(239, 68, 68, 0.2)' :
                                    'rgba(234, 179, 8, 0.2)',
                            color: isAlreadyShipped ? '#4ADE80' :
                                isCancelled ? '#F87171' :
                                    '#FACC15',
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
                        <div style={{ color: '#888', fontSize: '14px' }}>{order.customer?.phone || ''}</div>
                    </div>

                    {/* Tracking Number */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>TRACKING NUMBER</div>
                        <div style={{
                            color: '#22D3EE',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            wordBreak: 'break-all'
                        }}>
                            {order.tracking_no || order.parcelasia_shipment_id || 'Not synced'}
                        </div>
                    </div>

                    {/* Items */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>ITEMS</div>
                        {order.items?.map((item: any, i: number) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                borderBottom: i < (order.items?.length || 0) - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                            }}>
                                <span style={{ color: 'white' }}>{item.name} x{item.quantity}</span>
                                <span style={{ color: '#4ADE80' }}>RM {item.price}</span>
                            </div>
                        ))}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            marginTop: '8px',
                            borderTop: '1px solid rgba(255,255,255,0.2)',
                            fontWeight: 'bold'
                        }}>
                            <span>Total</span>
                            <span style={{ color: '#22D3EE' }}>RM {order.total_amount?.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {isAlreadyShipped ? (
                            <button
                                disabled
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    color: '#4ADE80',
                                    border: '2px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '8px',
                                    fontWeight: 'bold'
                                }}
                            >
                                ✅ Already Shipped
                            </button>
                        ) : isCancelled ? (
                            <button
                                disabled
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#F87171',
                                    border: '2px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    fontWeight: 'bold'
                                }}
                            >
                                ❌ Order Cancelled
                            </button>
                        ) : isShippable ? (
                            <>
                                <button
                                    onClick={openPackingChecklist}
                                    disabled={loading}
                                    style={{
                                        flex: 2,
                                        padding: '16px',
                                        background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        fontSize: '16px',
                                        cursor: loading ? 'wait' : 'pointer',
                                        boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
                                    }}
                                >
                                    {loading ? 'Processing...' : '📦 PACK & SHIP'}
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '16px',
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        color: '#F87171',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: loading ? 'wait' : 'pointer'
                                    }}
                                >
                                    ❌ Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                disabled
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    background: 'rgba(100, 100, 100, 0.2)',
                                    color: '#888',
                                    border: '1px solid rgba(100, 100, 100, 0.3)',
                                    borderRadius: '8px'
                                }}
                            >
                                Cannot ship - Status: {order.status}
                            </button>
                        )}

                        {/* WhatsApp Button */}
                        {order.tracking_no && order.customer?.phone && (
                            <button
                                onClick={handleWhatsApp}
                                style={{
                                    padding: '16px 24px',
                                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)'
                                }}
                            >
                                💬 WhatsApp
                            </button>
                        )}
                    </div>

                    {/* Clear Button */}
                    <button
                        onClick={clearAndReset}
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

            {/* Quick Links */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
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
                <Link
                    href="/admin/orders/delivery-check"
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
                    🚚 Delivery Check
                </Link>
            </div>

            {/* Packing Checklist Modal */}
            {showPackingChecklist && order && (
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
                    onClick={() => setShowPackingChecklist(false)}
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
                        {/* Header */}
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                            <h2 style={{
                                color: 'white',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                margin: 0
                            }}>
                                Packing Checklist
                            </h2>
                            <p style={{
                                color: '#888',
                                fontSize: '14px',
                                margin: '8px 0 0'
                            }}>
                                Check each item as you pack it
                            </p>
                        </div>

                        {/* Order Info */}
                        <div style={{
                            background: 'rgba(34, 211, 238, 0.1)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '16px',
                            border: '1px solid rgba(34, 211, 238, 0.2)'
                        }}>
                            <div style={{ color: '#22D3EE', fontSize: '14px', fontWeight: 'bold' }}>
                                Order #{order.id.substring(0, 12)}
                            </div>
                            <div style={{ color: '#888', fontSize: '12px' }}>
                                {order.customer?.name || 'Customer'}
                            </div>
                        </div>

                        {/* Items Checklist */}
                        <div style={{ marginBottom: '20px' }}>
                            {order.items?.map((item: any, index: number) => (
                                <label
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '16px',
                                        background: checkedItems[index]
                                            ? 'rgba(34, 197, 94, 0.1)'
                                            : 'rgba(255,255,255,0.05)',
                                        border: checkedItems[index]
                                            ? '2px solid rgba(34, 197, 94, 0.5)'
                                            : '2px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        marginBottom: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => toggleItemChecked(index)}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '6px',
                                        background: checkedItems[index]
                                            ? '#22C55E'
                                            : 'rgba(255,255,255,0.1)',
                                        border: checkedItems[index]
                                            ? 'none'
                                            : '2px solid rgba(255,255,255,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}>
                                        {checkedItems[index] && (
                                            <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            color: checkedItems[index] ? '#4ADE80' : 'white',
                                            fontWeight: 'bold',
                                            fontSize: '15px'
                                        }}>
                                            {item.name}
                                        </div>
                                        <div style={{ color: '#888', fontSize: '13px' }}>
                                            Qty: {item.quantity} × RM {item.price}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: 'rgba(34, 211, 238, 0.2)',
                                        color: '#22D3EE',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        fontWeight: 'bold'
                                    }}>
                                        ×{item.quantity}
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Progress */}
                        <div style={{
                            marginBottom: '20px',
                            textAlign: 'center',
                            color: allItemsChecked ? '#4ADE80' : '#888'
                        }}>
                            {allItemsChecked ? (
                                '✅ All items checked!'
                            ) : (
                                `${Object.values(checkedItems).filter(Boolean).length} / ${order.items?.length || 0} items checked`
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowPackingChecklist(false)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: '#888',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '15px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleShip}
                                disabled={!allItemsChecked || loading}
                                style={{
                                    flex: 2,
                                    padding: '14px',
                                    background: allItemsChecked
                                        ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
                                        : 'rgba(100,100,100,0.3)',
                                    color: allItemsChecked ? 'white' : '#666',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: allItemsChecked ? 'pointer' : 'not-allowed',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    boxShadow: allItemsChecked
                                        ? '0 4px 15px rgba(34, 197, 94, 0.4)'
                                        : 'none'
                                }}
                            >
                                {loading ? 'Processing...' : '🚚 Confirm Ship'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Confirmation Modal */}
            {showWhatsAppPrompt && order && (
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
                >
                    <div
                        style={{
                            background: '#1a1a2e',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '100%',
                            border: '1px solid rgba(34, 211, 238, 0.3)',
                            boxShadow: '0 0 40px rgba(34, 211, 238, 0.2)',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
                        <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '22px' }}>Order Shipped!</h2>
                        <p style={{ color: '#888', marginBottom: '24px', fontSize: '15px' }}>
                            Would you like to send the WhatsApp confirmation to <strong>{order.customer?.name}</strong>?
                        </p>

                        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                            <button
                                onClick={() => {
                                    handleWhatsApp();
                                    clearAndReset(); // Clear after opening WhatsApp
                                    setShowWhatsAppPrompt(false);
                                }}
                                style={{
                                    padding: '16px',
                                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)'
                                }}
                            >
                                <span style={{ fontSize: '20px' }}>💬</span> YES, Send WhatsApp
                            </button>

                            <button
                                onClick={() => {
                                    setShowWhatsAppPrompt(false);
                                    clearAndReset();
                                }}
                                style={{
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#888',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '15px'
                                }}
                            >
                                No, Scan Next Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
