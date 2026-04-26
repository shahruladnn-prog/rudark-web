'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { getPromos, deletePromo, togglePromoStatus } from '@/actions/promo-actions';
import { useToast } from '@/components/ui/toast';

export default function PromosPage() {
    const { showToast } = useToast();
    const [promos, setPromos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const data = await getPromos();
        setPromos(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`Delete promo code "${code}" permanently?`)) return;
        await deletePromo(id);
        showToast('success', `Promo ${code} deleted`);
        load();
    };

    const handleToggle = async (id: string, current: boolean, code: string) => {
        await togglePromoStatus(id, current);
        showToast('success', `${code} ${current ? 'disabled' : 'enabled'}`);
        load();
    };

    return (
        <div className="max-w-4xl pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Promo Codes</h1>
                    <p className="text-sm text-gray-400">Manage discount codes and vouchers</p>
                </div>
                <Link href="/admin/promos/new"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
                    <Plus size={15} /> New Promo
                </Link>
            </div>

            {/* List */}
            <div className="space-y-3">
                {loading && <div className="text-center text-gray-400 py-10 text-sm">Loading…</div>}

                {!loading && promos.length === 0 && (
                    <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-lg">
                        <Tag size={32} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-3">No promo codes yet.</p>
                        <Link href="/admin/promos/new" className="text-blue-600 font-medium text-sm hover:underline">
                            Create your first code
                        </Link>
                    </div>
                )}

                {promos.map(promo => (
                    <div key={promo.id}
                        className={`bg-white border rounded-lg p-4 flex items-center justify-between shadow-sm transition-colors ${
                            promo.active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                        }`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-lg ${promo.active ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                <Tag size={18} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900 tracking-wide font-mono">{promo.code}</span>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                        {promo.type === 'percentage' ? `${promo.value}% OFF` : `RM ${promo.value} OFF`}
                                    </span>
                                    {promo.active
                                        ? <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-medium">Active</span>
                                        : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-medium">Disabled</span>
                                    }
                                </div>
                                <div className="flex gap-4 text-xs text-gray-400 mt-0.5">
                                    <span>Used: {promo.usage_count} / {promo.usage_limit || '∞'}</span>
                                    <span>Min spend: RM {promo.min_spend || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleToggle(promo.id, promo.active, promo.code)}
                                className={`p-2 rounded transition-colors ${promo.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                title={promo.active ? 'Disable' : 'Enable'}
                            >
                                {promo.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                            </button>
                            <Link href={`/admin/promos/${promo.id}`}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <Edit size={16} />
                            </Link>
                            <button onClick={() => handleDelete(promo.id, promo.code)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
