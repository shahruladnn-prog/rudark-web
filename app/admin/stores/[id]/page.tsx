'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, Star, Trash2 } from 'lucide-react';
import { getStore, saveStore, deleteStore } from '@/actions/store-actions';
import { Store, DEFAULT_STORE } from '@/types/store';

interface PageParams {
    params: Promise<{ id: string }>;
}

export default function StoreEditPage({ params }: PageParams) {
    const router = useRouter();
    const [storeId, setStoreId] = useState<string>('');
    const [isNew, setIsNew] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Store>>(DEFAULT_STORE);

    useEffect(() => {
        params.then(p => {
            setStoreId(p.id);
            setIsNew(p.id === 'new');
            if (p.id !== 'new') {
                loadStore(p.id);
            } else {
                setLoading(false);
            }
        });
    }, [params]);

    const loadStore = async (id: string) => {
        setLoading(true);
        const store = await getStore(id);
        if (store) {
            setFormData(store);
        }
        setLoading(false);
    };

    const handleChange = (field: keyof Store, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name?.trim()) {
            alert('Store name is required');
            return;
        }
        if (!formData.loyverse_store_id?.trim()) {
            alert('Loyverse Store ID is required');
            return;
        }

        setSaving(true);
        const result = await saveStore({
            ...formData,
            id: isNew ? undefined : storeId
        });

        if (result.success) {
            router.push('/admin/stores');
        } else {
            alert('Error: ' + result.error);
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this store? This cannot be undone.')) return;

        const result = await deleteStore(storeId);
        if (result.success) {
            router.push('/admin/stores');
        } else {
            alert('Error: ' + result.error);
        }
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center text-gray-400">
                Loading...
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* Header */}
            <div className="border-b border-rudark-grey pb-6 mb-8">
                <Link href="/admin/stores" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm">
                    <ArrowLeft size={16} />
                    Back to Stores
                </Link>
                <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                    {isNew ? 'New' : 'Edit'} <span className="text-rudark-volt">Store</span>
                </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm space-y-4">
                    <h2 className="text-lg font-bold text-white uppercase mb-4">Store Details</h2>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase mb-2">Store Name *</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                            placeholder="e.g. Main Store, Penang Branch"
                            className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase mb-2">Address</label>
                        <input
                            type="text"
                            value={formData.address || ''}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="Store address"
                            className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-2">Phone</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="Store phone"
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 uppercase mb-2">Email</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="Store email"
                                className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white focus:border-rudark-volt focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Loyverse Integration */}
                <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm space-y-4">
                    <h2 className="text-lg font-bold text-white uppercase mb-4">Loyverse Integration</h2>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase mb-2">Loyverse Store ID *</label>
                        <input
                            type="text"
                            value={formData.loyverse_store_id || ''}
                            onChange={(e) => handleChange('loyverse_store_id', e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white font-mono focus:border-rudark-volt focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Find this in Loyverse Back Office → Settings → Store</p>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 uppercase mb-2">Loyverse Payment Type ID</label>
                        <input
                            type="text"
                            value={formData.loyverse_payment_type_id || ''}
                            onChange={(e) => handleChange('loyverse_payment_type_id', e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="w-full bg-rudark-matte border border-rudark-grey rounded-sm p-3 text-white font-mono focus:border-rudark-volt focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Used for receipt creation. Find in Loyverse API → Payment Types</p>
                    </div>
                </div>

                {/* Settings */}
                <div className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm space-y-4">
                    <h2 className="text-lg font-bold text-white uppercase mb-4">Settings</h2>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Star size={18} className="text-rudark-volt" />
                                <span className="text-white font-bold">Default Store</span>
                            </div>
                            <p className="text-gray-500 text-sm mt-1">Web orders will sync to this store</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleChange('is_default', !formData.is_default)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_default ? 'bg-rudark-volt' : 'bg-gray-700'
                                }`}
                        >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_default ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-rudark-grey">
                        <div>
                            <span className="text-white font-bold">Active</span>
                            <p className="text-gray-500 text-sm mt-1">Store can receive orders</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleChange('is_active', !formData.is_active)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-green-500' : 'bg-gray-700'
                                }`}
                        >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_active ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                    {!isNew && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={formData.is_default}
                            className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={18} />
                            Delete Store
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <Link
                            href="/admin/stores"
                            className="px-6 py-3 border border-rudark-grey text-gray-300 rounded-sm hover:border-white hover:text-white transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 bg-rudark-volt text-black font-bold rounded-sm hover:bg-white disabled:opacity-50 transition-colors"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Store'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
