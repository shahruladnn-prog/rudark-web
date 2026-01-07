'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getPromo, savePromo } from '@/actions/promo-actions';

interface PromoEditorProps {
    params: {
        id: string;
    }
}

export default function PromoEditor({ params }: PromoEditorProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage',
        value: 0,
        min_spend: 0,
        usage_limit: 0
    });

    useEffect(() => {
        const load = async () => {
            if (params.id && params.id !== 'new') {
                const data = await getPromo(params.id);
                if (data) {
                    setFormData({
                        code: data.code,
                        type: data.type,
                        value: data.value,
                        min_spend: data.min_spend || 0,
                        usage_limit: data.usage_limit || 0
                    });
                }
            }
            setFetching(false);
        };
        load();
    }, [params.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await savePromo({
            id: params.id,
            ...formData
        });

        if (res.success) {
            router.push('/admin/promos');
        } else {
            alert('Error: ' + res.error);
        }
        setLoading(false);
    };

    if (fetching) return <div className="p-8 text-gray-500">Loading protocol...</div>;

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <Link href="/admin/promos" className="inline-flex items-center text-gray-400 hover:text-white mb-6 uppercase text-xs font-bold tracking-widest transition-colors">
                <ArrowLeft size={14} className="mr-2" /> Back to Vault
            </Link>

            <div className="bg-rudark-carbon border border-rudark-grey p-8 rounded-sm shadow-xl">
                <h1 className="text-3xl font-condensed font-bold text-white uppercase mb-8 pb-4 border-b border-rudark-grey">
                    {params.id === 'new' ? 'Issue New Protocol' : 'Edit Protocol'}
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Code */}
                    <div>
                        <label className="block text-rudark-volt text-xs font-bold uppercase tracking-wider mb-2">Promo Code</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. SUMMER25"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className="w-full bg-rudark-matte border border-rudark-grey text-white px-4 py-3 focus:outline-none focus:border-rudark-volt uppercase font-mono text-lg tracking-widest"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Type */}
                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Discount Type</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white px-4 py-3 focus:outline-none focus:border-rudark-volt appearance-none"
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ($)</option>
                            </select>
                        </div>

                        {/* Value */}
                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Value</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white px-4 py-3 focus:outline-none focus:border-rudark-volt font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Min Spend */}
                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Min Spend ($)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.min_spend}
                                onChange={e => setFormData({ ...formData, min_spend: parseFloat(e.target.value) })}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white px-4 py-3 focus:outline-none focus:border-rudark-volt font-mono"
                            />
                        </div>

                        {/* Usage Limit */}
                        <div>
                            <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Usage Limit</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0 for unlimited"
                                value={formData.usage_limit}
                                onChange={e => setFormData({ ...formData, usage_limit: parseFloat(e.target.value) })}
                                className="w-full bg-rudark-matte border border-rudark-grey text-white px-4 py-3 focus:outline-none focus:border-rudark-volt font-mono"
                            />
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">0 = Unlimited Uses</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-rudark-volt text-black font-condensed font-bold text-xl uppercase py-4 tracking-wider hover:bg-white transition-colors mt-8 disabled:opacity-50"
                    >
                        {loading ? 'Saving Protocol...' : 'Save Promo Code'}
                    </button>

                </form>
            </div>
        </div>
    );
}
