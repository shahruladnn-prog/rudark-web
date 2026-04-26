'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Building2, Star, Trash2 } from 'lucide-react';
import { getStore, saveStore, deleteStore } from '@/actions/store-actions';
import { Store, DEFAULT_STORE } from '@/types/store';
import { useToast } from '@/components/ui/toast';

interface PageParams {
    params: Promise<{ id: string }>;
}

export default function StoreEditPage({ params }: PageParams) {
    const router = useRouter();
    const { showToast } = useToast();
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
            showToast('warning', 'Store name is required');
            return;
        }
        if (!formData.loyverse_store_id?.trim()) {
            showToast('warning', 'Loyverse Store ID is required');
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
            showToast('error', result.error || 'An error occurred');
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this store? This cannot be undone.')) return;

        const result = await deleteStore(storeId);
        if (result.success) {
            router.push('/admin/stores');
        } else {
            showToast('error', result.error || 'An error occurred');
        }
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center text-gray-400">
                Loading...
            </div>
        );
    }

    const inp = "w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400";

    return (
        <div className="max-w-2xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/stores" className="p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
                <h1 className="text-xl font-bold text-gray-900">{isNew ? 'New Store' : 'Edit Store'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-gray-700">Store Details</h2>
                    <div><label className="text-xs text-gray-500 uppercase mb-1 block">Store Name *</label>
                        <input type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. Main Store, Penang Branch" className={inp} /></div>
                    <div><label className="text-xs text-gray-500 uppercase mb-1 block">Address</label>
                        <input type="text" value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} placeholder="Store address" className={inp} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-gray-500 uppercase mb-1 block">Phone</label>
                            <input type="text" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="Store phone" className={inp} /></div>
                        <div><label className="text-xs text-gray-500 uppercase mb-1 block">Email</label>
                            <input type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="Store email" className={inp} /></div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-gray-700">Loyverse Integration</h2>
                    <div><label className="text-xs text-gray-500 uppercase mb-1 block">Loyverse Store ID *</label>
                        <input type="text" value={formData.loyverse_store_id || ''} onChange={e => handleChange('loyverse_store_id', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inp + " font-mono"} />
                        <p className="text-xs text-gray-400 mt-1">Find in Loyverse Back Office → Settings → Store</p></div>
                    <div><label className="text-xs text-gray-500 uppercase mb-1 block">Loyverse Payment Type ID</label>
                        <input type="text" value={formData.loyverse_payment_type_id || ''} onChange={e => handleChange('loyverse_payment_type_id', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={inp + " font-mono"} />
                        <p className="text-xs text-gray-400 mt-1">Used for receipt creation — find in Loyverse API → Payment Types</p></div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-gray-700">Settings</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2"><Star size={15} className="text-blue-500" /><span className="font-medium text-gray-900 text-sm">Default Store</span></div>
                            <p className="text-xs text-gray-400 mt-0.5">Web orders will sync to this store</p>
                        </div>
                        <button type="button" onClick={() => handleChange('is_default', !formData.is_default)}
                            className={`w-11 h-6 rounded-full transition-colors relative ${formData.is_default ? 'bg-blue-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_default ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div>
                            <span className="font-medium text-gray-900 text-sm">Active</span>
                            <p className="text-xs text-gray-400 mt-0.5">Store can receive orders</p>
                        </div>
                        <button type="button" onClick={() => handleChange('is_active', !formData.is_active)}
                            className={`w-11 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.is_active ? 'left-6' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    {!isNew && (
                        <button type="button" onClick={handleDelete} disabled={formData.is_default}
                            className="flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                            <Trash2 size={15} /> Delete Store
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <Link href="/admin/stores" className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300">Cancel</Link>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                            <Save size={15} /> {saving ? 'Saving…' : 'Save Store'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
