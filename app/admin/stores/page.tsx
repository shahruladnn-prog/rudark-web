'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Building2, Star, RefreshCw, AlertCircle } from 'lucide-react';
import { getStores, deleteStore, initializeDefaultStore } from '@/actions/store-actions';
import { Store } from '@/types/store';
import { useToast } from '@/components/ui/toast';

export default function StoresPage() {
    const { showToast } = useToast();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);

    const loadStores = async () => {
        setLoading(true);
        try { const data = await getStores(); setStores(data); }
        catch { showToast('error', 'Failed to load stores'); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadStores(); }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete store "${name}"? This cannot be undone.`)) return;
        const result = await deleteStore(id);
        if (result.success) { await loadStores(); showToast('success', 'Store deleted'); }
        else showToast('error', result.error || 'An error occurred');
    };

    const handleInitialize = async () => {
        if (!confirm('Create default store from Loyverse settings?')) return;
        setInitializing(true);
        const result = await initializeDefaultStore();
        if (result.success) { await loadStores(); showToast('success', 'Default store created'); }
        else showToast('warning', result.error || 'Already initialized');
        setInitializing(false);
    };

    return (
        <div className="max-w-4xl pb-20">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Store Management</h1>
                    <p className="text-sm text-gray-400">Configure Loyverse store locations for order sync</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadStores} disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300 disabled:opacity-50">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <Link href="/admin/stores/new"
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
                        <Plus size={15} /> New Store
                    </Link>
                </div>
            </div>

            {loading && <div className="text-center py-16 text-gray-400 text-sm">Loading stores…</div>}

            {!loading && stores.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <AlertCircle size={20} className="text-amber-500" />
                        <h2 className="font-semibold text-amber-700">No Stores Configured</h2>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">Your system is using hardcoded Loyverse settings. Click below to migrate to dynamic store management.</p>
                    <button onClick={handleInitialize} disabled={initializing}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded font-medium text-sm hover:bg-amber-600 disabled:opacity-50">
                        {initializing ? <><RefreshCw size={15} className="animate-spin" /> Creating…</> : <><Building2 size={15} /> Initialize Default Store</>}
                    </button>
                </div>
            )}

            {stores.length > 0 && (
                <div className="space-y-3">
                    {stores.map(store => (
                        <div key={store.id}
                            className={`bg-white border rounded-lg p-5 shadow-sm transition-colors ${store.is_default ? 'border-blue-300' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className={`p-2.5 rounded-lg ${store.is_default ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="font-semibold text-gray-900">{store.name}</h3>
                                            {store.is_default && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded">
                                                    <Star size={10} /> Default
                                                </span>
                                            )}
                                            {!store.is_active && (
                                                <span className="px-2 py-0.5 bg-red-50 text-red-500 text-xs font-medium rounded">Inactive</span>
                                            )}
                                        </div>
                                        {store.address && <p className="text-sm text-gray-500 mb-1">{store.address}</p>}
                                        <div className="flex gap-4 text-xs text-gray-400 font-mono">
                                            <span>Store: {store.loyverse_store_id.substring(0, 8)}…</span>
                                            {store.loyverse_payment_type_id && <span>Payment: {store.loyverse_payment_type_id.substring(0, 8)}…</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Link href={`/admin/stores/${store.id}`}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                        <Edit size={15} />
                                    </Link>
                                    <button onClick={() => handleDelete(store.id, store.name)} disabled={store.is_default}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={store.is_default ? 'Cannot delete default store' : 'Delete'}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">How It Works</h3>
                <ul className="space-y-1.5 text-gray-500 text-sm">
                    <li>• <strong className="text-gray-700">Default Store</strong> receives all web orders for Loyverse sync</li>
                    <li>• <strong className="text-gray-700">Store ID</strong> is the UUID from Loyverse Back Office → Settings → Store</li>
                    <li>• <strong className="text-gray-700">Payment Type ID</strong> is for receipt creation (optional)</li>
                </ul>
            </div>
        </div>
    );
}
