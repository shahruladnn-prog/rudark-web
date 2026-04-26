'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, RefreshCw, Plus, X, Check } from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import {
    createAudit,
    getAudits,
    updateAuditCount,
    submitAuditForReview,
    applyAuditAdjustments,
    cancelAudit
} from '@/actions/stock-audit-actions';
import { StockAudit } from '@/types/stock-audit';
import { useToast } from '@/components/ui/toast';

export default function StockAuditPage() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [audits, setAudits] = useState<StockAudit[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    const [showCreate, setShowCreate] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [auditNotes, setAuditNotes] = useState('');
    const [creating, setCreating] = useState(false);

    const [activeAudit, setActiveAudit] = useState<StockAudit | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [countValue, setCountValue] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [auditsData, productsData] = await Promise.all([
                getAudits({ limit: 20 }),
                getProducts()
            ]);
            setAudits(auditsData);
            setProducts(productsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCreateAudit = async () => {
        if (selectedProducts.length === 0) {
            showToast('warning', 'Select at least one product');
            return;
        }
        setCreating(true);
        try {
            const res = await createAudit({ product_ids: selectedProducts, notes: auditNotes });
            if (res.success) {
                showToast('success', `Audit created: ${res.auditId?.slice(0, 8)}…`);
                setShowCreate(false);
                setSelectedProducts([]);
                setAuditNotes('');
                loadData();
            } else {
                showToast('error', res.error || 'Failed to create audit');
            }
        } catch (error: any) {
            showToast('error', error.message);
        } finally {
            setCreating(false);
        }
    };

    const handleSaveCount = async () => {
        if (!activeAudit || editingIndex === null) return;
        const count = parseInt(countValue);
        if (isNaN(count) || count < 0) {
            showToast('warning', 'Enter a valid count');
            return;
        }
        const res = await updateAuditCount(activeAudit.id!, editingIndex, count);
        if (res.success) {
            loadData();
            setEditingIndex(null);
            setCountValue('');
        } else {
            showToast('error', res.error || 'Failed to save count');
        }
    };

    const handleSubmitForReview = async () => {
        if (!activeAudit) return;
        const res = await submitAuditForReview(activeAudit.id!);
        if (res.success) {
            showToast('success', 'Audit submitted for review');
            loadData();
            setActiveAudit(null);
        } else {
            showToast('error', res.error || 'Failed to submit');
        }
    };

    const handleApplyAdjustments = async (auditId: string) => {
        if (!confirm('Apply all adjustments? Stock levels will be updated.')) return;
        const res = await applyAuditAdjustments(auditId);
        if (res.success) {
            showToast('success', `Applied ${res.applied} adjustments`);
            loadData();
        } else {
            showToast('error', res.error || 'Failed to apply');
        }
    };

    const handleCancelAudit = async (auditId: string) => {
        if (!confirm('Cancel this audit?')) return;
        const res = await cancelAudit(auditId);
        if (res.success) {
            showToast('success', 'Audit cancelled');
            loadData();
            setActiveAudit(null);
        } else {
            showToast('error', res.error || 'Failed to cancel');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'IN_PROGRESS': return 'bg-blue-50 text-blue-600 border border-blue-200';
            case 'REVIEWING': return 'bg-amber-50 text-amber-600 border border-amber-200';
            case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
            case 'CANCELLED': return 'bg-gray-100 text-gray-500 border border-gray-200';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="max-w-6xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900">Stock Audit</h1>
                    <p className="text-sm text-gray-400">Count inventory and fix discrepancies</p>
                </div>
                <button onClick={loadData} disabled={loading} className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 text-sm">
                    <Plus size={15} /><span className="hidden md:inline">New Audit</span>
                </button>
            </div>

            {/* Create Audit Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">New Audit</h2>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[55vh]">
                            <p className="text-sm text-gray-500 mb-4">Select products to include in this audit:</p>
                            <div className="space-y-1 mb-4">
                                {products.slice(0, 50).map(p => (
                                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input type="checkbox" checked={selectedProducts.includes(p.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedProducts([...selectedProducts, p.id]);
                                                else setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                                            }}
                                            className="accent-blue-600" />
                                        <span className="text-gray-900 text-sm">{p.name}</span>
                                        <span className="text-gray-400 text-xs ml-auto">Stock: {p.stock_quantity}</span>
                                    </label>
                                ))}
                            </div>
                            <textarea value={auditNotes} onChange={(e) => setAuditNotes(e.target.value)}
                                placeholder="Notes (optional)"
                                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                rows={2} />
                        </div>
                        <div className="p-4 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-sm text-gray-500">{selectedProducts.length} selected</span>
                            <button onClick={handleCreateAudit} disabled={creating || selectedProducts.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                                {creating ? 'Creating…' : 'Start Audit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audits List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
                ) : audits.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-lg">
                        <ClipboardCheck size={40} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-500 text-sm">No audits yet</p>
                        <p className="text-xs text-gray-400 mt-1">Create your first audit to count inventory</p>
                    </div>
                ) : (
                    audits.map(audit => (
                        <div key={audit.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-semibold text-gray-900">{audit.audit_number}</div>
                                    <div className="text-xs text-gray-400">{formatDate(audit.created_at)}</div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${getStatusStyle(audit.status)}`}>
                                    {audit.status}
                                </span>
                            </div>

                            {audit.summary && (
                                <div className="flex gap-4 text-sm text-gray-500 mb-3">
                                    <span>Items: {audit.summary.total_items}</span>
                                    <span>Counted: {audit.summary.counted}</span>
                                    <span className={audit.summary.discrepancies > 0 ? 'text-amber-600 font-medium' : ''}>
                                        Discrepancies: {audit.summary.discrepancies}
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {audit.status === 'IN_PROGRESS' && (
                                    <>
                                        <button onClick={() => setActiveAudit(audit)}
                                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                                            Continue Counting
                                        </button>
                                        <button onClick={() => handleCancelAudit(audit.id!)}
                                            className="px-3 py-2 border border-gray-200 text-gray-600 text-sm rounded hover:border-gray-300">
                                            Cancel
                                        </button>
                                    </>
                                )}
                                {audit.status === 'REVIEWING' && (
                                    <button onClick={() => handleApplyAdjustments(audit.id!)}
                                        className="flex-1 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700">
                                        Apply Adjustments
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Active Audit Counting Modal */}
            {activeAudit && (
                <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
                    <div className="max-w-2xl mx-auto p-4 pt-8">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-xl">
                            <div className="flex justify-between items-center p-4 border-b border-gray-100">
                                <div>
                                    <h2 className="font-semibold text-gray-900">{activeAudit.audit_number}</h2>
                                    <p className="text-sm text-gray-500">Enter physical counts</p>
                                </div>
                                <button onClick={() => setActiveAudit(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            </div>

                            <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
                                {activeAudit.items.map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 border border-gray-100 rounded p-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="text-gray-900 text-sm font-medium">{item.product_name}</div>
                                                {item.variant_label && <div className="text-xs text-gray-500">{item.variant_label}</div>}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400">System</div>
                                                    <div className="text-gray-900 font-mono text-sm">{item.system_quantity}</div>
                                                </div>
                                                <div className="text-right min-w-[80px]">
                                                    <div className="text-xs text-gray-400">Counted</div>
                                                    {editingIndex === idx ? (
                                                        <div className="flex gap-1">
                                                            <input type="number" value={countValue}
                                                                onChange={(e) => setCountValue(e.target.value)}
                                                                className="w-16 border border-blue-400 rounded px-2 py-1 text-gray-900 text-sm focus:outline-none"
                                                                autoFocus />
                                                            <button onClick={handleSaveCount} className="text-emerald-600 hover:text-emerald-700">
                                                                <Check size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => {
                                                            setEditingIndex(idx);
                                                            setCountValue(item.counted_quantity?.toString() || '');
                                                        }} className="text-blue-600 font-mono hover:underline text-sm">
                                                            {item.counted_quantity !== undefined ? item.counted_quantity : '—'}
                                                        </button>
                                                    )}
                                                </div>
                                                {item.discrepancy !== undefined && item.discrepancy !== 0 && (
                                                    <div className={`text-sm font-bold ${item.discrepancy > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-gray-100 flex gap-3">
                                <button onClick={handleSubmitForReview}
                                    disabled={activeAudit.items.some(i => i.counted_quantity === undefined)}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                                    Submit for Review
                                </button>
                                <button onClick={() => handleCancelAudit(activeAudit.id!)}
                                    className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded hover:border-gray-300 text-sm">
                                    Cancel Audit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
