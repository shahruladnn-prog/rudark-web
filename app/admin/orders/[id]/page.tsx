'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, Truck, MapPin, User, Mail, Phone, Clock, CheckCircle, XCircle, RefreshCw, RotateCcw, X } from 'lucide-react';
import { getOrderById, updateOrderStatus, reprocessOrder } from '@/actions/order-admin-actions';
import { processSuccessfulOrder } from '@/actions/order-utils';
import { processRefund, getRefundableItems } from '@/actions/refund-actions';
import { generateWhatsAppLink } from '@/actions/parcelasia-sync';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Pending', color: 'yellow' },
    { value: 'EXPIRED', label: 'Expired', color: 'gray' },
    { value: 'PAID', label: 'Paid', color: 'green' },
    { value: 'PROCESSING', label: 'Processing', color: 'blue' },
    { value: 'READY_TO_SHIP', label: 'Ready to Ship', color: 'blue' },
    { value: 'SHIPPED', label: 'Shipped', color: 'purple' },
    { value: 'DELIVERED', label: 'Delivered', color: 'green' },
    { value: 'COMPLETED', label: 'Completed', color: 'green' },
    { value: 'REFUNDED', label: 'Refunded', color: 'orange' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
];

interface PageParams {
    params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageParams) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [orderId, setOrderId] = useState<string>('');
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundItems, setRefundItems] = useState<any[]>([]);
    const [refundReason, setRefundReason] = useState('');

    useEffect(() => {
        params.then(p => {
            setOrderId(p.id);
            loadOrder(p.id);
        });
    }, [params]);

    const loadOrder = async (id: string) => {
        setLoading(true);
        const data = await getOrderById(id);
        setOrder(data);
        setLoading(false);
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!orderId) return;
        setUpdating(true);
        const result = await updateOrderStatus(orderId, newStatus);
        if (result.success) {
            await loadOrder(orderId);
        } else {
            alert('Failed to update status: ' + result.error);
        }
        setUpdating(false);
    };

    const handleReprocess = async () => {
        if (!orderId) return;
        if (!confirm('Re-run order processing? This will mark as PAID (if pending), sync Loyverse, and create ParcelAsia shipment.')) return;
        setUpdating(true);
        try {
            const result = await reprocessOrder(orderId);
            if (result.success) {
                await loadOrder(orderId);
                alert('Order reprocessed successfully!');
            } else {
                alert('Reprocess failed: ' + result.error);
            }
        } catch (error) {
            alert('Failed to reprocess: ' + error);
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
            alert('No refundable items found');
        }
    };

    const handleProcessRefund = async () => {
        if (!orderId || refundItems.length === 0) return;
        if (!refundReason.trim()) {
            alert('Please enter a refund reason');
            return;
        }
        if (!confirm('Process this refund? Stock will be restored for items marked as returned.')) return;

        setUpdating(true);
        try {
            const itemsToRefund = refundItems
                .filter((item: any) => item.quantity_to_refund > 0)
                .map((item: any) => ({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    sku: item.sku,
                    variant_sku: item.variant_sku,
                    selected_options: item.selected_options,
                    quantity: item.quantity_to_refund,
                    return_to_stock: item.return_to_stock
                }));

            const result = await processRefund(
                orderId,
                itemsToRefund,
                refundReason,
                itemsToRefund.reduce((sum: number, i: any) => sum + i.quantity, 0) === order.items.length ? 'FULL' : 'PARTIAL'
            );

            if (result.success) {
                alert('Refund processed successfully');
                setShowRefundModal(false);
                await loadOrder(orderId);
            } else {
                alert('Failed to process refund: ' + result.error);
            }
        } catch (error) {
            alert('Error processing refund: ' + error);
        }
        setUpdating(false);
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center text-gray-400">
                Loading order...
            </div>
        );
    }

    if (!order) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center">
                <p className="text-red-400 text-xl mb-4">Order not found</p>
                <Link href="/admin/orders" className="text-rudark-volt hover:underline">
                    ← Back to Orders
                </Link>
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-MY', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <Link href="/admin/orders" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
                        <ArrowLeft size={16} />
                        Back to Orders
                    </Link>
                    <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                        Order <span className="text-rudark-volt">{order.id}</span>
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">{formatDate(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                    {['PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
                        <button
                            onClick={handleOpenRefund}
                            disabled={updating}
                            className="flex items-center gap-2 px-4 py-2 border border-orange-500/50 text-orange-400 hover:border-orange-400 hover:text-orange-300 transition-colors rounded-sm disabled:opacity-50"
                        >
                            <RotateCcw size={16} />
                            Refund
                        </button>
                    )}
                    <button
                        onClick={handleReprocess}
                        disabled={updating}
                        className="flex items-center gap-2 px-4 py-2 border border-rudark-grey text-gray-300 hover:border-rudark-volt hover:text-rudark-volt transition-colors rounded-sm disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={updating ? 'animate-spin' : ''} />
                        Reprocess
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">Order Status</h2>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleStatusChange(opt.value)}
                                    disabled={updating}
                                    className={`px-4 py-2 rounded-sm border font-bold text-sm uppercase transition-all ${order.status === opt.value
                                        ? 'bg-rudark-volt text-black border-rudark-volt'
                                        : 'border-rudark-grey text-gray-400 hover:border-gray-500 hover:text-white'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {order.payment_status && (
                            <div className="mt-4 text-sm">
                                <span className="text-gray-500">Payment: </span>
                                <span className={order.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'}>
                                    {order.payment_status.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">Order Items</h2>
                        <div className="space-y-3">
                            {(order.items || []).map((item: any, index: number) => (
                                <div key={index} className="flex justify-between items-center py-3 border-b border-rudark-grey/30 last:border-0">
                                    <div>
                                        <div className="text-white font-medium">{item.name}</div>
                                        <div className="text-gray-500 text-xs font-mono">SKU: {item.sku}</div>
                                        {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                            <div className="text-gray-400 text-xs mt-1">
                                                {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-white">x{item.quantity}</div>
                                        <div className="text-rudark-volt font-mono">RM {((item.promo_price || item.web_price) * item.quantity).toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipping Info */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">
                            {order.delivery_method === 'self_collection' ? 'Collection Info' : 'Shipping Info'}
                        </h2>

                        {order.delivery_method === 'self_collection' ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-blue-400">
                                    <MapPin size={18} />
                                    <span className="font-bold">Self-Collection</span>
                                </div>
                                <div className="text-gray-300">{order.collection_point_name}</div>
                                <div className="text-gray-500 text-sm">{order.collection_point_address}</div>
                                <div className="text-rudark-volt mt-2">Fee: RM {(order.collection_fee || 0).toFixed(2)}</div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-purple-400">
                                    <Truck size={18} />
                                    <span className="font-bold">Delivery</span>
                                </div>
                                <div className="text-gray-300">{order.shipping_provider || 'Standard'} - {order.shipping_service || 'Express'}</div>
                                <div className="text-gray-500 text-sm">Shipping Cost: RM {(order.shipping_cost || 0).toFixed(2)}</div>

                                {/* Tracking Info */}
                                <div className="mt-3 p-3 bg-rudark-matte rounded">
                                    {order.tracking_no && order.tracking_no !== 'N/A' ? (
                                        <>
                                            <div className="text-xs text-gray-500 uppercase">Tracking Number</div>
                                            <div className="text-rudark-volt font-mono font-bold text-lg">{order.tracking_no}</div>
                                            <a
                                                href={`https://www.tracking.my/jnt/${order.tracking_no}`}
                                                target="_blank"
                                                rel="noopener"
                                                className="text-xs text-blue-400 hover:underline"
                                            >
                                                Track Package →
                                            </a>
                                        </>
                                    ) : order.parcelasia_shipment_id ? (
                                        <>
                                            <div className="text-xs text-yellow-500 uppercase">⏳ Pending Checkout</div>
                                            <div className="text-gray-400 text-sm mt-1">
                                                Added to ParcelAsia cart. Tracking available after checkout.
                                            </div>
                                            <div className="text-xs text-gray-600 font-mono mt-2">
                                                ID: {order.parcelasia_shipment_id.substring(0, 12)}...
                                            </div>
                                            <Link
                                                href="/admin/orders/batch-sync"
                                                className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30"
                                            >
                                                🔄 Sync Tracking
                                            </Link>
                                        </>
                                    ) : (
                                        <div className="text-gray-500 text-sm">No tracking available</div>
                                    )}
                                </div>

                                {/* WhatsApp Button */}
                                {order.tracking_no && order.customer?.phone && (
                                    <button
                                        onClick={async () => {
                                            const items = (order.items || []).map((item: any) => ({
                                                name: item.name,
                                                quantity: item.quantity
                                            }));
                                            const url = await generateWhatsAppLink(
                                                order.customer.phone,
                                                orderId,
                                                order.tracking_no,
                                                order.customer.name,
                                                items,
                                                "Rud'Ark ProShop"
                                            );
                                            window.open(url, '_blank');
                                        }}
                                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
                                    >
                                        💬 Send WhatsApp
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">Customer</h2>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <User size={18} className="text-gray-500" />
                                <span className="text-white">{order.customer?.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={18} className="text-gray-500" />
                                <span className="text-gray-300">{order.customer?.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={18} className="text-gray-500" />
                                <span className="text-gray-300">{order.customer?.phone}</span>
                            </div>
                        </div>
                        {order.customer?.address && (
                            <div className="mt-4 pt-4 border-t border-rudark-grey/30">
                                <div className="text-xs text-gray-500 uppercase mb-2">Shipping Address</div>
                                <div className="text-gray-300 text-sm">{order.customer.address}</div>
                                <div className="text-gray-400 text-sm">{order.customer.postcode} {order.customer.city}</div>
                                <div className="text-gray-400 text-sm">{order.customer.state}</div>
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">Summary</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Subtotal</span>
                                <span className="text-white font-mono">RM {(order.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Shipping</span>
                                <span className="text-white font-mono">RM {(order.shipping_cost || 0).toFixed(2)}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Discount</span>
                                    <span className="text-green-400 font-mono">-RM {order.discount_amount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-3 border-t border-rudark-grey">
                                <span className="text-white font-bold">Total</span>
                                <span className="text-rudark-volt font-mono font-bold text-xl">RM {(order.total_amount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Technical Info */}
                    <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm">
                        <h2 className="text-lg font-bold text-white uppercase mb-4">System Info</h2>
                        <div className="space-y-2 text-xs font-mono">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Loyverse</span>
                                <div className="flex items-center gap-2">
                                    <span className={order.loyverse_status === 'SYNCED' ? 'text-green-400' : 'text-yellow-400'}>
                                        {order.loyverse_status || 'PENDING'}
                                    </span>
                                    {order.loyverse_status === 'FAILED' && (
                                        <button
                                            onClick={handleReprocess}
                                            className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded hover:bg-red-500/30"
                                            title="Retry Sync"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Gateway</span>
                                <span className="text-gray-300">{order.payment_gateway || 'chip'}</span>
                            </div>
                            {order.chip_payment_data?.purchase_id && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Purchase ID</span>
                                    <span className="text-gray-300 truncate max-w-[120px]">{order.chip_payment_data.purchase_id}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Refund Modal */}
            {showRefundModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b border-rudark-grey">
                            <h2 className="text-xl font-bold text-white uppercase">Process Refund</h2>
                            <button onClick={() => setShowRefundModal(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Refund Items */}
                            <div className="space-y-3">
                                {refundItems.map((item: any, index: number) => (
                                    <div key={index} className="bg-rudark-matte p-4 rounded-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="text-white font-medium">{item.product_name}</div>
                                                {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                                                    <div className="text-gray-400 text-xs mt-1">
                                                        {Object.entries(item.selected_options).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                                    </div>
                                                )}
                                                <div className="text-gray-500 text-xs">
                                                    Max refundable: {item.refundable_quantity} of {item.original_quantity}
                                                </div>
                                            </div>
                                            <div className="text-rudark-volt font-mono">
                                                RM {(item.price * item.quantity_to_refund).toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <label className="text-gray-400 text-sm">Qty:</label>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={item.refundable_quantity}
                                                    value={item.quantity_to_refund}
                                                    onChange={(e) => {
                                                        const newItems = [...refundItems];
                                                        newItems[index].quantity_to_refund = Math.min(
                                                            parseInt(e.target.value) || 0,
                                                            item.refundable_quantity
                                                        );
                                                        setRefundItems(newItems);
                                                    }}
                                                    className="w-16 bg-rudark-carbon border border-rudark-grey text-white text-center py-1 rounded-sm"
                                                />
                                            </div>

                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={item.return_to_stock}
                                                    onChange={(e) => {
                                                        const newItems = [...refundItems];
                                                        newItems[index].return_to_stock = e.target.checked;
                                                        setRefundItems(newItems);
                                                    }}
                                                    className="rounded"
                                                />
                                                <span className="text-gray-300">Return to stock</span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Refund Reason *</label>
                                <textarea
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="Enter reason for refund..."
                                    className="w-full bg-rudark-matte border border-rudark-grey text-white p-3 rounded-sm"
                                    rows={3}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-rudark-grey">
                                <button
                                    onClick={() => setShowRefundModal(false)}
                                    className="px-4 py-2 border border-rudark-grey text-gray-300 hover:text-white rounded-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleProcessRefund}
                                    disabled={updating || !refundReason.trim()}
                                    className="px-6 py-2 bg-orange-500 text-white font-bold rounded-sm hover:bg-orange-400 disabled:opacity-50"
                                >
                                    {updating ? 'Processing...' : 'Process Refund'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
