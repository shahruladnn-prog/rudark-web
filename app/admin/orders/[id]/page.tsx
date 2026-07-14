'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Package, Truck, MapPin, User, Mail, Phone,
    CheckCircle, RefreshCw, RotateCcw, X, AlertTriangle, ExternalLink, Clock
} from 'lucide-react';
import { getOrderById, updateOrderStatus, reprocessOrder } from '@/actions/order-admin-actions';
import { processRefund, getRefundableItems } from '@/actions/refund-actions';
import { generateWhatsAppLink } from '@/actions/parcelasia-sync';
import { collectPreOrderBalance } from '@/actions/pre-order-actions';
import { useToast } from '@/components/ui/toast';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'DEPOSIT_PAID', label: 'Deposit Paid' },
    { value: 'BALANCE_DUE', label: 'Balance Due' },
    { value: 'PAID', label: 'Paid' },
    { value: 'PROCESSING', label: 'Processing' },
    { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'REFUNDED', label: 'Refunded' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const IRREVERSIBLE_STATUSES = new Set(['SHIPPED', 'DELIVERED', 'COMPLETED', 'REFUNDED', 'CANCELLED']);

interface PageParams { params: Promise<{ id: string }>; }

export default function OrderDetailPage({ params }: PageParams) {
    const { showToast } = useToast();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundItems, setRefundItems] = useState<any[]>([]);
    const [refundReason, setRefundReason] = useState('');
    const [balanceLinkUrl, setBalanceLinkUrl] = useState<string | null>(null);
    const [generatingBalanceLink, setGeneratingBalanceLink] = useState(false);

    useEffect(() => {
        params.then(p => { setOrderId(p.id); loadOrder(p.id); });
    }, [params]);

    const loadOrder = async (id: string) => {
        setLoading(true);
        const data = await getOrderById(id);
        setOrder(data);
        setLoading(false);
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!orderId) return;
        if (IRREVERSIBLE_STATUSES.has(newStatus) && newStatus !== order.status) {
            if (!confirm(`Change status to ${newStatus}? This action is difficult to reverse.`)) return;
        }
        setUpdating(true);
        const result = await updateOrderStatus(orderId, newStatus);
        if (result.success) {
            showToast('success', `Status updated to ${newStatus}`);
            await loadOrder(orderId);
        } else {
            showToast('error', 'Failed to update status: ' + result.error);
        }
        setUpdating(false);
    };

    const handleReprocess = async () => {
        if (!orderId) return;
        if (!confirm('Re-run order processing? This marks as PAID (if pending), syncs Loyverse, and creates a ParcelAsia shipment.')) return;
        setUpdating(true);
        const result = await reprocessOrder(orderId);
        if (result.success) {
            showToast('success', 'Order reprocessed successfully');
            await loadOrder(orderId);
        } else {
            showToast('error', 'Reprocess failed: ' + result.error);
        }
        setUpdating(false);
    };

    const handleOpenRefund = async () => {
        if (!orderId) return;
        const result = await getRefundableItems(orderId);
        if (result.success && result.items.length > 0) {
            setRefundItems(result.items.map((item: any) => ({
                ...item,
                quantity_to_refund: item.refundable_quantity,
                return_to_stock: true
            })));
            setShowRefundModal(true);
        } else {
            showToast('warning', 'No refundable items found for this order');
        }
    };

    const refundTotal = refundItems.reduce(
        (sum, item) => sum + ((item.price || 0) * (item.quantity_to_refund || 0)), 0
    );

    const handleProcessRefund = async () => {
        if (!orderId || refundItems.length === 0) return;
        if (!refundReason.trim()) {
            showToast('warning', 'Please enter a refund reason');
            return;
        }
        if (!confirm(`Process refund of RM ${refundTotal.toFixed(2)}? Stock will be restored for marked items.`)) return;

        setUpdating(true);
        const itemsToRefund = refundItems
            .filter(i => i.quantity_to_refund > 0)
            .map(i => ({
                product_id: i.product_id,
                product_name: i.product_name,
                sku: i.sku,
                variant_sku: i.variant_sku,
                selected_options: i.selected_options,
                quantity: i.quantity_to_refund,
                return_to_stock: i.return_to_stock
            }));

        const totalQtyRefunded = itemsToRefund.reduce((s, i) => s + i.quantity, 0);
        const totalQtyOriginal = (order.items || []).reduce((s: number, i: any) => s + i.quantity, 0);

        const result = await processRefund(
            orderId,
            itemsToRefund,
            refundReason,
            totalQtyRefunded >= totalQtyOriginal ? 'FULL' : 'PARTIAL'
        );

        if (result.success) {
            showToast('success', `Refund of RM ${refundTotal.toFixed(2)} processed`);
            setShowRefundModal(false);
            setRefundReason('');
            await loadOrder(orderId);
        } else {
            showToast('error', 'Refund failed: ' + result.error);
        }
        setUpdating(false);
    };

    const handleGenerateBalanceLink = async () => {
        if (!orderId) return;
        setGeneratingBalanceLink(true);
        const result = await collectPreOrderBalance(orderId);
        if (result.success && result.checkoutUrl) {
            setBalanceLinkUrl(result.checkoutUrl);
            showToast('success', 'Balance payment link generated');
            await loadOrder(orderId);
        } else {
            showToast('error', 'Failed to generate balance link: ' + result.error);
        }
        setGeneratingBalanceLink(false);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-MY', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return (
        <div className="max-w-4xl mx-auto py-20 text-center text-gray-400">Loading order...</div>
    );

    if (!order) return (
        <div className="max-w-4xl mx-auto py-20 text-center">
            <p className="text-red-500 text-lg mb-4">Order not found</p>
            <Link href="/admin/orders" className="text-blue-600 hover:underline">← Back to Orders</Link>
        </div>
    );

    const loyverseFailed = order.loyverse_status === 'FAILED' || order.loyverse_sync_error;
    const shipmentFailed = order.parcelasia_error;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Link href="/admin/orders" className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 mb-3 text-sm">
                        <ArrowLeft size={15} /> Back to Orders
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">Order <span className="font-mono text-gray-600">{order.id}</span></h1>
                    <p className="text-gray-400 text-sm mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                    {['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DEPOSIT_PAID', 'BALANCE_DUE'].includes(order.status) && (
                        <button
                            onClick={handleOpenRefund}
                            disabled={updating}
                            className="flex items-center gap-1.5 px-3 py-2 border border-orange-200 text-orange-600 rounded text-sm hover:bg-orange-50 disabled:opacity-50"
                        >
                            <RotateCcw size={14} /> Refund
                        </button>
                    )}
                    <button
                        onClick={handleReprocess}
                        disabled={updating}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={updating ? 'animate-spin' : ''} /> Reprocess
                    </button>
                </div>
            </div>

            {/* Sync failure banners */}
            {loyverseFailed && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-700">Loyverse inventory sync failed</p>
                        <p className="text-xs text-red-500 mt-0.5">{order.loyverse_sync_error || 'Unknown error'} — stock may not have been deducted in POS.</p>
                    </div>
                    <button onClick={handleReprocess} disabled={updating} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 disabled:opacity-50 shrink-0">
                        Retry Sync
                    </button>
                </div>
            )}
            {shipmentFailed && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-700">ParcelAsia shipment creation failed</p>
                        <p className="text-xs text-amber-500 mt-0.5">{order.parcelasia_error}</p>
                    </div>
                    <button onClick={handleReprocess} disabled={updating} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded hover:bg-amber-200 disabled:opacity-50 shrink-0">
                        Retry
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Status */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Order Status</h2>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleStatusChange(opt.value)}
                                    disabled={updating || opt.value === order.status}
                                    className={`px-3 py-1.5 rounded border text-sm font-medium transition-all ${
                                        order.status === opt.value
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 disabled:opacity-50'
                                    }`}
                                >
                                    {opt.label}
                                    {IRREVERSIBLE_STATUSES.has(opt.value) && opt.value !== order.status && (
                                        <span className="ml-1 text-gray-300 text-xs">⚠</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {order.payment_status && (
                            <div className="mt-3 text-xs text-gray-400">
                                Payment: <span className={order.payment_status === 'paid' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>{order.payment_status.toUpperCase()}</span>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Items ({(order.items || []).length})</h2>
                        <div className="divide-y divide-gray-50">
                            {(order.items || []).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center py-3">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">SKU: {item.sku}</div>
                                        {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400">×{item.quantity}</div>
                                        <div className="text-sm font-semibold text-gray-900">RM {(item.web_price * item.quantity).toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipping */}
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">
                            {order.delivery_method === 'self_collection' ? 'Collection' : 'Shipping'}
                        </h2>
                        {order.delivery_method === 'self_collection' ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                                    <MapPin size={14} /> Self-Collection
                                </div>
                                <div className="text-sm text-gray-700">{order.collection_point_name}</div>
                                <div className="text-xs text-gray-400">{order.collection_point_address}</div>
                                <div className="text-sm text-gray-600 mt-1">Fee: RM {(order.collection_fee || 0).toFixed(2)}</div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Truck size={14} className="text-gray-400" />
                                    {order.shipping_provider || 'Standard'} · {order.shipping_service || 'Express'} · RM {(order.shipping_cost || 0).toFixed(2)}
                                </div>
                                <div className="p-3 bg-gray-50 rounded border border-gray-100">
                                    {order.tracking_no && order.tracking_no !== 'N/A' ? (
                                        <div>
                                            <div className="text-xs text-gray-400 uppercase mb-1">Tracking Number</div>
                                            <div className="font-mono font-bold text-gray-900 text-lg">{order.tracking_no}</div>
                                            <a href={`https://www.tracking.my/jnt/${order.tracking_no}`} target="_blank" rel="noopener"
                                                className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                Track package <ExternalLink size={11} />
                                            </a>
                                        </div>
                                    ) : order.parcelasia_shipment_id ? (
                                        <div>
                                            <div className="text-xs text-amber-600 font-medium">⏳ Awaiting tracking number</div>
                                            <div className="text-xs text-gray-400 mt-1">Will be available once courier picks up the parcel.</div>
                                            <div className="text-xs text-gray-300 font-mono mt-1">Shipment ID: {order.parcelasia_shipment_id.slice(0, 12)}…</div>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400">No tracking available</div>
                                    )}
                                </div>
                                {order.tracking_no && order.customer?.phone && (
                                    <button
                                        onClick={async () => {
                                            const items = (order.items || []).map((i: any) => ({ name: i.name, quantity: i.quantity }));
                                            const url = await generateWhatsAppLink(order.customer.phone, orderId, order.tracking_no, order.customer.name, items, "Rud'Ark ProShop");
                                            window.open(url, '_blank');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                                    >
                                        💬 Send WhatsApp Tracking
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Customer</h2>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-900"><User size={14} className="text-gray-400" />{order.customer?.name}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-500"><Mail size={14} className="text-gray-300" />{order.customer?.email}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-500"><Phone size={14} className="text-gray-300" />{order.customer?.phone}</div>
                        </div>
                        {order.customer?.address && (
                            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 leading-5">
                                <div className="font-medium text-gray-600 mb-1">Shipping Address</div>
                                {order.customer.address}<br />
                                {order.customer.postcode} {order.customer.city}<br />
                                {order.customer.state}
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Order Summary</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal</span>
                                <span>RM {(order.subtotal || order.total_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Shipping</span>
                                <span>RM {(order.shipping_cost || 0).toFixed(2)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between text-green-600"><span>Discount</span><span>−RM {order.discount_amount.toFixed(2)}</span></div>
                            )}
                            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2 text-base">
                                <span>Total</span><span>RM {(order.total_amount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Pre-Order Deposit/Balance */}
                    {order.is_pre_order && (
                        <div className="bg-white border border-purple-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-purple-700 mb-3">Pre-Order</h2>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>Full total</span>
                                    <span>RM {(order.pre_order_full_total || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Deposit ({order.pre_order_deposit_percent || 0}%)</span>
                                    <span className="text-green-600 font-medium">RM {(order.deposit_amount || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>Balance due</span>
                                    <span className={order.balance_status === 'paid' ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                                        RM {(order.balance_amount || 0).toFixed(2)} {order.balance_status === 'paid' ? '(Paid)' : ''}
                                    </span>
                                </div>
                            </div>

                            {order.status === 'DEPOSIT_PAID' && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={handleGenerateBalanceLink}
                                        disabled={generatingBalanceLink}
                                        className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        {generatingBalanceLink ? 'Generating…' : 'Generate Balance Payment Link'}
                                    </button>
                                    {balanceLinkUrl && (
                                        <div className="mt-3 space-y-2">
                                            <input
                                                readOnly
                                                value={balanceLinkUrl}
                                                onFocus={(e) => e.target.select()}
                                                className="w-full text-xs font-mono px-2 py-2 border border-gray-200 rounded bg-gray-50 text-gray-600"
                                            />
                                            {order.customer?.phone && (
                                                <a
                                                    href={`https://wa.me/${order.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.customer.name}, your pre-order is ready! Please settle the balance payment here: ${balanceLinkUrl}`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block text-center px-3 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                                                >
                                                    Share via WhatsApp
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status Timeline */}
                    {order.status_history && order.status_history.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                                <Clock size={14} className="text-gray-400" /> Status Timeline
                            </h2>
                            <ol className="relative border-l border-gray-200 ml-2 space-y-3">
                                {[...order.status_history].reverse().map((entry: any, i: number) => (
                                    <li key={i} className="ml-4">
                                        <div className="absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white bg-blue-400" style={{ top: `${i * 52 + 4}px` }} />
                                        <p className="text-xs font-semibold text-gray-800">{entry.status}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {entry.timestamp
                                                ? new Date(entry.timestamp).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : '—'}
                                        </p>
                                        {entry.tracking_no && (
                                            <p className="text-[10px] text-blue-500 font-mono mt-0.5">{entry.tracking_no}</p>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">System Info</h2>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Loyverse</span>
                                <span className={`font-medium ${order.loyverse_status === 'SYNCED' || order.type === 'POS' ? 'text-green-600' : order.loyverse_status === 'FAILED' ? 'text-red-600' : 'text-amber-500'}`}>
                                    {order.type === 'POS' ? 'SYNCED' : (order.loyverse_status || 'PENDING')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Gateway</span>
                                <span className="text-gray-700 uppercase font-medium">{order.type === 'POS' ? 'Loyverse POS' : (order.payment_gateway || 'chip')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Method</span>
                                <span className="text-gray-700 font-medium">{order.payment_method || '—'}</span>
                            </div>
                            {order.chip_payment_data?.purchase_id && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Purchase ID</span>
                                    <span className="text-gray-600 font-mono truncate max-w-[120px]">{order.chip_payment_data.purchase_id}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Refund Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">Process Refund</h2>
                            <button onClick={() => setShowRefundModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {refundItems.map((item, index) => (
                                <div key={index} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                                            {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-400 mt-0.5">Max refundable: {item.refundable_quantity} of {item.original_quantity}</div>
                                        </div>
                                        <div className="text-sm font-semibold text-gray-900">RM {((item.price || 0) * (item.quantity_to_refund || 0)).toFixed(2)}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-gray-500">Qty:</label>
                                            <input
                                                type="number" min={0} max={item.refundable_quantity}
                                                value={item.quantity_to_refund}
                                                onChange={(e) => {
                                                    const n = [...refundItems];
                                                    n[index].quantity_to_refund = Math.min(parseInt(e.target.value) || 0, item.refundable_quantity);
                                                    setRefundItems(n);
                                                }}
                                                className="w-16 border border-gray-200 rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-blue-400"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox" checked={item.return_to_stock}
                                                onChange={(e) => {
                                                    const n = [...refundItems];
                                                    n[index].return_to_stock = e.target.checked;
                                                    setRefundItems(n);
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-gray-600 text-sm">Return to stock</span>
                                        </label>
                                    </div>
                                </div>
                            ))}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
                                <textarea
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="Reason for refund..."
                                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-400"
                                    rows={3}
                                />
                            </div>

                            {/* Refund total */}
                            <div className="flex justify-between items-center p-3 bg-orange-50 border border-orange-100 rounded-lg">
                                <span className="text-sm font-medium text-orange-700">Refund Amount</span>
                                <span className="text-lg font-bold text-orange-700">RM {refundTotal.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setShowRefundModal(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProcessRefund}
                                    disabled={updating || !refundReason.trim() || refundTotal === 0}
                                    className="px-6 py-2 bg-orange-500 text-white font-medium rounded text-sm hover:bg-orange-600 disabled:opacity-50"
                                >
                                    {updating ? 'Processing…' : `Refund RM ${refundTotal.toFixed(2)}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
