import Link from 'next/link';
import { getPurchaseOrders } from '@/actions/purchase-order-actions';
import { Plus, ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';

const STATUS_CONFIG = {
    DRAFT:              { label: 'Draft',              color: 'bg-gray-100 text-gray-600' },
    ORDERED:            { label: 'Ordered',            color: 'bg-blue-100 text-blue-700' },
    PARTIALLY_RECEIVED: { label: 'Partial',            color: 'bg-amber-100 text-amber-700' },
    RECEIVED:           { label: 'Received',           color: 'bg-emerald-100 text-emerald-700' },
    CANCELLED:          { label: 'Cancelled',          color: 'bg-red-100 text-red-600' },
};

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
    const orders = await getPurchaseOrders();

    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <div className="max-w-5xl pb-20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
                        <p className="text-sm text-gray-400">Track supplier orders and receive goods</p>
                    </div>
                </div>
                <Link
                    href="/admin/stock/purchase-orders/new"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <Plus size={15} /> New PO
                </Link>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-lg">
                    <Package size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 mb-2 text-sm">No purchase orders yet</p>
                    <Link href="/admin/stock/purchase-orders/new" className="text-blue-600 text-sm font-medium hover:underline">
                        Create your first PO →
                    </Link>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="text-left px-4 py-3">Reference</th>
                                <th className="text-left px-4 py-3">Supplier</th>
                                <th className="text-center px-4 py-3">Status</th>
                                <th className="text-center px-4 py-3">Items</th>
                                <th className="text-left px-4 py-3">Expected</th>
                                <th className="text-left px-4 py-3">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map(po => {
                                const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.DRAFT;
                                const totalOrdered = po.items.reduce((s, i) => s + i.ordered_qty, 0);
                                const totalReceived = po.items.reduce((s, i) => s + (i.received_qty || 0), 0);
                                return (
                                    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/stock/purchase-orders/${po.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                                                {po.reference}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{po.supplier_name}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono text-gray-700">
                                                {po.items.length} lines
                                            </span>
                                            {totalReceived > 0 && (
                                                <div className="text-[11px] text-gray-400">
                                                    {totalReceived}/{totalOrdered} units received
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{po.expected_date ? fmtDate(po.expected_date) : '—'}</td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(po.created_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
