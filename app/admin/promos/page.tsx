'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Tag, Percent, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { getPromos, deletePromo, togglePromoStatus } from '@/actions/promo-actions';

export default function PromosPage() {
    const [promos, setPromos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const data = await getPromos();
        setPromos(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this promo code permanently?")) return;
        await deletePromo(id);
        load();
    };

    const handleToggle = async (id: string, current: boolean) => {
        await togglePromoStatus(id, current);
        load();
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">

            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Promo <span className="text-rudark-volt">Vault</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Manage discount codes, vouchers, and special offers.
                    </p>
                </div>
                <Link href="/admin/promos/new" className="flex items-center gap-2 bg-rudark-volt text-black px-6 py-2 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors">
                    <Plus size={18} />
                    New Promo
                </Link>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {promos.map((promo) => (
                    <div key={promo.id} className={`bg-rudark-carbon p-6 border rounded-sm flex items-center justify-between group transition-colors ${promo.active ? 'border-rudark-grey hover:border-rudark-volt' : 'border-red-900/30 opacity-70'}`}>
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-sm ${promo.active ? 'bg-rudark-matte text-rudark-volt' : 'bg-red-900/10 text-red-500'}`}>
                                <Tag size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-condensed font-bold text-white uppercase tracking-wider flex items-center gap-4">
                                    {promo.code}
                                    <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300 font-normal">
                                        {promo.type === 'percentage' ? `${promo.value}% OFF` : `$${promo.value} OFF`}
                                    </span>
                                </h3>
                                <div className="flex gap-4 text-xs text-gray-500 font-mono mt-1 uppercase">
                                    <span>Used: {promo.usage_count} / {promo.usage_limit || '∞'}</span>
                                    <span>•</span>
                                    <span>Min Spend: ${promo.min_spend || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => handleToggle(promo.id, promo.active)}
                                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors ${promo.active ? 'text-green-400 hover:text-green-300' : 'text-gray-500 hover:text-gray-400'}`}
                            >
                                {promo.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                {promo.active ? 'Active' : 'Disabled'}
                            </button>

                            <div className="w-px h-8 bg-rudark-grey mx-2"></div>

                            <Link href={`/admin/promos/${promo.id}`} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <Edit size={18} />
                            </Link>
                            <button
                                onClick={() => handleDelete(promo.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {loading && <div className="text-center text-gray-500 py-10">Loading Vault...</div>}

                {!loading && promos.length === 0 && (
                    <div className="text-center py-20 bg-rudark-carbon border border-rudark-grey border-dashed rounded-sm">
                        <p className="text-gray-400 mb-4">No active vouchers.</p>
                        <Link href="/admin/promos/new" className="text-rudark-volt font-bold uppercase text-sm hover:underline">Create your first code</Link>
                    </div>
                )}
            </div>

        </div>
    );
}
