'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, ClipboardCheck, Package, CheckCircle, AlertCircle,
    RefreshCw, Plus, X, Edit2, Check, XCircle
} from 'lucide-react';
import { getProducts } from '@/actions/product-actions';
import {
    createAudit,
    getAudits,
    updateAuditCount,
    submitAuditForReview,
    applyAuditAdjustments,
    cancelAudit
} from '@/actions/stock-audit-actions';
import { StockAudit, AuditItem } from '@/types/stock-audit';

export default function StockAuditPage() {
    const [loading, setLoading] = useState(true);
    const [audits, setAudits] = useState<StockAudit[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Create audit state
    const [showCreate, setShowCreate] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [auditNotes, setAuditNotes] = useState('');
    const [creating, setCreating] = useState(false);

    // Active audit state
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

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateAudit = async () => {
        if (selectedProducts.length === 0) {
            setResult({ success: false, message: 'Select at least one product' });
            return;
        }

        setCreating(true);
        setResult(null);

        try {
            const res = await createAudit({
                product_ids: selectedProducts,
                notes: auditNotes
            });

            if (res.success) {
                setResult({ success: true, message: `Audit created: ${res.auditId?.slice(0, 8)}...` });
                setShowCreate(false);
                setSelectedProducts([]);
                setAuditNotes('');
                loadData();
            } else {
                setResult({ success: false, message: res.error || 'Failed to create audit' });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message });
        } finally {
            setCreating(false);
        }
    };

    const handleSaveCount = async () => {
        if (!activeAudit || editingIndex === null) return;

        const count = parseInt(countValue);
        if (isNaN(count) || count < 0) {
            setResult({ success: false, message: 'Enter a valid count' });
            return;
        }

        const res = await updateAuditCount(activeAudit.id!, editingIndex, count);

        if (res.success) {
            // Refresh audit data
            loadData();
            setEditingIndex(null);
            setCountValue('');
        } else {
            setResult({ success: false, message: res.error || 'Failed to save count' });
        }
    };

    const handleSubmitForReview = async () => {
        if (!activeAudit) return;

        const res = await submitAuditForReview(activeAudit.id!);
        if (res.success) {
            setResult({ success: true, message: 'Audit submitted for review' });
            loadData();
            setActiveAudit(null);
        } else {
            setResult({ success: false, message: res.error || 'Failed to submit' });
        }
    };

    const handleApplyAdjustments = async (auditId: string) => {
        if (!confirm('Apply all adjustments? Stock levels will be updated.')) return;

        const res = await applyAuditAdjustments(auditId);
        if (res.success) {
            setResult({ success: true, message: `Applied ${res.applied} adjustments` });
            loadData();
        } else {
            setResult({ success: false, message: res.error || 'Failed to apply' });
        }
    };

    const handleCancelAudit = async (auditId: string) => {
        if (!confirm('Cancel this audit?')) return;

        const res = await cancelAudit(auditId);
        if (res.success) {
            setResult({ success: true, message: 'Audit cancelled' });
            loadData();
            setActiveAudit(null);
        } else {
            setResult({ success: false, message: res.error || 'Failed to cancel' });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'IN_PROGRESS': return 'text-blue-400 bg-blue-900/20';
            case 'REVIEWING': return 'text-yellow-400 bg-yellow-900/20';
            case 'COMPLETED': return 'text-green-400 bg-green-900/20';
            case 'CANCELLED': return 'text-gray-400 bg-gray-900/20';
            default: return 'text-gray-400';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-rudark-grey pb-6 mb-8">
                <Link href="/admin/stock" className="p-2 text-gray-400 hover:text-rudark-volt">
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl md:text-4xl font-condensed font-bold text-white uppercase mb-1">
                        Stock <span className="text-rudark-volt">Audit</span>
                    </h1>
                    <p className="text-gray-500 font-mono text-xs md:text-sm">
                        Count inventory and fix discrepancies
                    </p>
                </div>
                <button onClick={loadData} disabled={loading} className="p-2 text-gray-400 hover:text-rudark-volt">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rudark-volt text-black font-bold rounded-sm"
                >
                    <Plus size={18} />
                    <span className="hidden md:inline">New Audit</span>
                </button>
            </div>

            {/* Result Message */}
            {result && (
                <div className={`p-3 rounded-sm flex items-center gap-2 mb-4 ${result.success ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'
                    }`}>
                    {result.success ? <CheckCircle size={18} className="text-green-400" /> : <AlertCircle size={18} className="text-red-400" />}
                    <span className={result.success ? 'text-green-400' : 'text-red-400'} style={{ fontSize: '0.875rem' }}>{result.message}</span>
                </div>
            )}

            {/* Create Audit Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm w-full max-w-lg max-h-[80vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-rudark-grey">
                            <h2 className="font-bold text-white uppercase">New Audit</h2>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            <p className="text-sm text-gray-400 mb-4">Select products to include in this audit:</p>
                            <div className="space-y-2 mb-4">
                                {products.slice(0, 50).map(p => (
                                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-rudark-matte rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedProducts.includes(p.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProducts([...selectedProducts, p.id]);
                                                } else {
                                                    setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                                                }
                                            }}
                                            className="accent-rudark-volt"
                                        />
                                        <span className="text-white text-sm">{p.name}</span>
                                        <span className="text-gray-500 text-xs ml-auto">Stock: {p.stock_quantity}</span>
                                    </label>
                                ))}
                            </div>
                            <textarea
                                value={auditNotes}
                                onChange={(e) => setAuditNotes(e.target.value)}
                                placeholder="Notes (optional)"
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm px-3 py-2 text-white text-sm"
                                rows={2}
                            />
                        </div>
                        <div className="p-4 border-t border-rudark-grey flex justify-between items-center">
                            <span className="text-sm text-gray-400">{selectedProducts.length} selected</span>
                            <button
                                onClick={handleCreateAudit}
                                disabled={creating || selectedProducts.length === 0}
                                className="px-4 py-2 bg-rudark-volt text-black font-bold rounded-sm disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Start Audit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audits List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-gray-400">Loading...</div>
                ) : audits.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <ClipboardCheck size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No audits yet</p>
                        <p className="text-sm">Create your first audit to count inventory</p>
                    </div>
                ) : (
                    audits.map(audit => (
                        <div key={audit.id} className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="font-bold text-white">{audit.audit_number}</div>
                                    <div className="text-xs text-gray-500">{formatDate(audit.created_at)}</div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${getStatusColor(audit.status)}`}>
                                    {audit.status}
                                </span>
                            </div>

                            {audit.summary && (
                                <div className="flex gap-4 text-sm text-gray-400 mb-3">
                                    <span>Items: {audit.summary.total_items}</span>
                                    <span>Counted: {audit.summary.counted}</span>
                                    <span className={audit.summary.discrepancies > 0 ? 'text-yellow-400' : ''}>
                                        Discrepancies: {audit.summary.discrepancies}
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {audit.status === 'IN_PROGRESS' && (
                                    <>
                                        <button
                                            onClick={() => setActiveAudit(audit)}
                                            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-sm"
                                        >
                                            Continue Counting
                                        </button>
                                        <button
                                            onClick={() => handleCancelAudit(audit.id!)}
                                            className="px-3 py-2 bg-gray-700 text-white text-sm rounded-sm"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                )}
                                {audit.status === 'REVIEWING' && (
                                    <button
                                        onClick={() => handleApplyAdjustments(audit.id!)}
                                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-bold rounded-sm"
                                    >
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
                <div className="fixed inset-0 bg-black/90 z-50 overflow-y-auto">
                    <div className="max-w-2xl mx-auto p-4">
                        <div className="flex justify-between items-center py-4 border-b border-rudark-grey mb-4">
                            <div>
                                <h2 className="font-bold text-white uppercase">{activeAudit.audit_number}</h2>
                                <p className="text-sm text-gray-400">Enter physical counts</p>
                            </div>
                            <button onClick={() => setActiveAudit(null)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-2 mb-6">
                            {activeAudit.items.map((item, idx) => (
                                <div key={idx} className="bg-rudark-carbon border border-rudark-grey rounded-sm p-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="text-white">{item.product_name}</div>
                                            {item.variant_label && (
                                                <div className="text-xs text-gray-500">{item.variant_label}</div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-xs text-gray-500">System</div>
                                                <div className="text-white font-mono">{item.system_quantity}</div>
                                            </div>
                                            <div className="text-right min-w-[80px]">
                                                <div className="text-xs text-gray-500">Counted</div>
                                                {editingIndex === idx ? (
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="number"
                                                            value={countValue}
                                                            onChange={(e) => setCountValue(e.target.value)}
                                                            className="w-16 bg-rudark-matte border border-rudark-volt rounded px-2 py-1 text-white text-sm"
                                                            autoFocus
                                                        />
                                                        <button onClick={handleSaveCount} className="text-green-400">
                                                            <Check size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingIndex(idx);
                                                            setCountValue(item.counted_quantity?.toString() || '');
                                                        }}
                                                        className="text-rudark-volt font-mono hover:underline"
                                                    >
                                                        {item.counted_quantity !== undefined ? item.counted_quantity : '—'}
                                                    </button>
                                                )}
                                            </div>
                                            {item.discrepancy !== undefined && item.discrepancy !== 0 && (
                                                <div className={`text-sm font-bold ${item.discrepancy > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {item.discrepancy > 0 ? '+' : ''}{item.discrepancy}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSubmitForReview}
                                disabled={activeAudit.items.some(i => i.counted_quantity === undefined)}
                                className="flex-1 px-4 py-3 bg-rudark-volt text-black font-bold rounded-sm disabled:opacity-50"
                            >
                                Submit for Review
                            </button>
                            <button
                                onClick={() => handleCancelAudit(activeAudit.id!)}
                                className="px-4 py-3 bg-gray-700 text-white rounded-sm"
                            >
                                Cancel Audit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
