'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getPromo, savePromo } from '@/actions/promo-actions';
import { useToast } from '@/components/ui/toast';

interface PromoEditorProps {
    params: Promise<{ id: string; }>
}

export default function PromoEditor({ params }: PromoEditorProps) {
    const { showToast } = useToast();
    const { id } = use(params);
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
            if (id && id !== 'new') {
                const data = await getPromo(id);
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
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await savePromo({ id, ...formData });
        if (res.success) {
            router.push('/admin/promos');
        } else {
            showToast('error', res.error || 'Failed to save promo');
        }
        setLoading(false);
    };

    const inp = "w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400";

    if (fetching) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

    return (
        <div className="max-w-2xl pb-20">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/promos" className="p-2 text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></Link>
                <h1 className="text-xl font-bold text-gray-900">{id === 'new' ? 'New Promo Code' : 'Edit Promo Code'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
                    <h2 className="text-sm font-semibold text-gray-700">Promo Details</h2>
                    <div>
                        <label className="text-xs text-gray-500 uppercase mb-1 block">Promo Code *</label>
                        <input type="text" required placeholder="e.g. SUMMER25"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className={inp + " font-mono uppercase tracking-widest text-lg"} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase mb-1 block">Discount Type</label>
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className={inp}>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (RM)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase mb-1 block">Value</label>
                            <input type="number" required min="0" value={formData.value}
                                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                className={inp + " font-mono"} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase mb-1 block">Min Spend (RM)</label>
                            <input type="number" min="0" value={formData.min_spend}
                                onChange={e => setFormData({ ...formData, min_spend: parseFloat(e.target.value) })}
                                className={inp + " font-mono"} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase mb-1 block">Usage Limit</label>
                            <input type="number" min="0" placeholder="0 for unlimited" value={formData.usage_limit}
                                onChange={e => setFormData({ ...formData, usage_limit: parseFloat(e.target.value) })}
                                className={inp + " font-mono"} />
                            <p className="text-xs text-gray-400 mt-1">0 = Unlimited Uses</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <Link href="/admin/promos" className="px-4 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300">Cancel</Link>
                    <button type="submit" disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                        <Save size={15} /> {loading ? 'Saving…' : 'Save Promo Code'}
                    </button>
                </div>
            </form>
        </div>
    );
}
