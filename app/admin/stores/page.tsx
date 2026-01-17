'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Building2, Star, RefreshCw, AlertCircle } from 'lucide-react';
import { getStores, deleteStore, initializeDefaultStore } from '@/actions/store-actions';
import { Store } from '@/types/store';

export default function StoresPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);

    const loadStores = async () => {
        setLoading(true);
        try {
            const data = await getStores();
            setStores(data);
        } catch (error) {
            console.error('Failed to load stores:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStores();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete store "${name}"? This cannot be undone.`)) return;

        const result = await deleteStore(id);
        if (result.success) {
            await loadStores();
        } else {
            alert('Error: ' + result.error);
        }
    };

    const handleInitialize = async () => {
        if (!confirm('Create default store with current Loyverse settings? This migrates from hardcoded values.')) return;

        setInitializing(true);
        const result = await initializeDefaultStore();
        if (result.success) {
            await loadStores();
        } else {
            alert(result.error || 'Already initialized');
        }
        setInitializing(false);
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Store <span className="text-rudark-volt">Management</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Configure Loyverse store locations for order sync
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadStores}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 border border-rudark-grey text-gray-300 hover:border-rudark-volt hover:text-rudark-volt transition-colors rounded-sm disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <Link
                        href="/admin/stores/new"
                        className="flex items-center gap-2 bg-rudark-volt text-black px-6 py-2 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors"
                    >
                        <Plus size={18} />
                        New Store
                    </Link>
                </div>
            </div>

            {/* No Stores - Migration Prompt */}
            {!loading && stores.length === 0 && (
                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-sm p-6 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle size={24} className="text-yellow-400" />
                        <h2 className="text-lg font-bold text-yellow-400 uppercase">No Stores Configured</h2>
                    </div>
                    <p className="text-gray-300 mb-4">
                        Your system is using hardcoded Loyverse settings. Click below to migrate to dynamic store management.
                    </p>
                    <button
                        onClick={handleInitialize}
                        disabled={initializing}
                        className="flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black rounded-sm font-bold uppercase hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                    >
                        {initializing ? (
                            <>
                                <RefreshCw size={18} className="animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Building2 size={18} />
                                Initialize Default Store
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Stores List */}
            {stores.length > 0 && (
                <div className="space-y-4">
                    {stores.map(store => (
                        <div
                            key={store.id}
                            className={`bg-rudark-carbon p-6 border rounded-sm transition-colors ${store.is_default
                                    ? 'border-rudark-volt'
                                    : 'border-rudark-grey hover:border-gray-500'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-sm ${store.is_default ? 'bg-rudark-volt/20' : 'bg-gray-800'}`}>
                                        <Building2 size={24} className={store.is_default ? 'text-rudark-volt' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-bold text-white uppercase">{store.name}</h3>
                                            {store.is_default && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-rudark-volt/20 text-rudark-volt text-xs font-bold uppercase rounded-sm">
                                                    <Star size={12} />
                                                    Default
                                                </span>
                                            )}
                                            {!store.is_active && (
                                                <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs font-bold uppercase rounded-sm">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        {store.address && (
                                            <p className="text-gray-400 text-sm mb-2">{store.address}</p>
                                        )}
                                        <div className="flex gap-6 text-xs font-mono text-gray-500">
                                            <div>
                                                <span className="text-gray-600">Store ID:</span>{' '}
                                                <span className="text-gray-400">{store.loyverse_store_id.substring(0, 8)}...</span>
                                            </div>
                                            {store.loyverse_payment_type_id && (
                                                <div>
                                                    <span className="text-gray-600">Payment ID:</span>{' '}
                                                    <span className="text-gray-400">{store.loyverse_payment_type_id.substring(0, 8)}...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/admin/stores/${store.id}`}
                                        className="p-2 text-gray-400 hover:text-rudark-volt hover:bg-white/5 rounded-sm transition-colors"
                                    >
                                        <Edit size={18} />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(store.id, store.name)}
                                        disabled={store.is_default}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-900/10 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={store.is_default ? 'Cannot delete default store' : 'Delete store'}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="text-center py-20 text-gray-500">
                    Loading stores...
                </div>
            )}

            {/* Info */}
            <div className="mt-8 bg-rudark-carbon border border-rudark-grey rounded-sm p-6">
                <h3 className="font-bold text-white uppercase mb-3">How It Works</h3>
                <ul className="space-y-2 text-gray-400 text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-rudark-volt">•</span>
                        <span><strong className="text-white">Default Store</strong> receives all web orders for Loyverse sync</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-rudark-volt">•</span>
                        <span><strong className="text-white">Store ID</strong> is the UUID from Loyverse dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-rudark-volt">•</span>
                        <span><strong className="text-white">Payment Type ID</strong> is for receipt creation (optional)</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
