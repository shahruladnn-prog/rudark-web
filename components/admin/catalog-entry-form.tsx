'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { CatalogEntry } from '@/types';
import { saveCatalogEntry } from '@/actions/catalog-actions';
import ImageUploader from '@/components/admin/image-uploader';
import { useToast } from '@/components/ui/toast';

export default function CatalogEntryForm({ initialData }: { initialData?: CatalogEntry & { id?: string } }) {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<CatalogEntry>>(initialData || {
        title: '',
        slug: '',
        description: '',
        images: [],
        purchase_mode: 'inquire',
        price_display: 'quote',
        is_active: true,
        catalog_tags: [],
        use_cases: [],
    });

    const updateField = (field: keyof CatalogEntry, value: unknown) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const result = await saveCatalogEntry({ ...formData, id: initialData?.id });
        setLoading(false);
        if (result.success) {
            showToast('success', 'Catalog entry saved');
            router.push('/admin/catalog-entries');
            router.refresh();
        } else {
            showToast('error', result.error || 'Save failed');
        }
    };

    return (
        <form onSubmit={handleSave} className="max-w-3xl mx-auto pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/catalog-entries" className="p-2 text-gray-400 hover:text-gray-900">
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-black text-gray-900 uppercase">{initialData?.id ? 'Edit' : 'New'} Catalog Entry</h1>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Title</label>
                    <input
                        required
                        value={formData.title || ''}
                        onChange={e => {
                            updateField('title', e.target.value);
                            if (!initialData?.id && !formData.slug) {
                                updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                            }
                        }}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Slug</label>
                    <input
                        required
                        value={formData.slug || ''}
                        onChange={e => updateField('slug', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Description</label>
                    <textarea
                        rows={5}
                        value={formData.description || ''}
                        onChange={e => updateField('description', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 block mb-2">Images</label>
                    <ImageUploader
                        images={formData.images || []}
                        onChange={imgs => updateField('images', imgs)}
                        thumbnails={formData.image_thumbnails}
                        onChangeThumbnails={thumbs => updateField('image_thumbnails', thumbs)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Purchase mode</label>
                        <select
                            value={formData.purchase_mode || 'inquire'}
                            onChange={e => updateField('purchase_mode', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="inquire">Inquire</option>
                            <option value="display">Display</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Price display</label>
                        <select
                            value={formData.price_display || 'quote'}
                            onChange={e => updateField('price_display', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2"
                        >
                            <option value="quote">Quote</option>
                            <option value="from">From</option>
                            <option value="fixed">Fixed</option>
                            <option value="hidden">Hidden</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Reference price (RM)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.web_price ?? ''}
                        onChange={e => updateField('web_price', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Tags (comma-separated)</label>
                    <input
                        type="text"
                        value={(formData.catalog_tags || []).join(', ')}
                        onChange={e => updateField('catalog_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Use cases</label>
                    <div className="flex gap-2">
                        {(['retail', 'events', 'corporate'] as const).map(uc => {
                            const selected = formData.use_cases?.includes(uc);
                            return (
                                <button
                                    key={uc}
                                    type="button"
                                    onClick={() => {
                                        const c = formData.use_cases || [];
                                        updateField('use_cases', selected ? c.filter(x => x !== uc) : [...c, uc]);
                                    }}
                                    className={`px-3 py-1 text-xs font-bold uppercase border rounded ${selected ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300'}`}
                                >
                                    {uc}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">MOQ</label>
                        <input type="number" value={formData.moq ?? ''} onChange={e => updateField('moq', e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-gray-300 rounded px-3 py-2" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Lead days</label>
                        <input type="number" value={formData.lead_time_days ?? ''} onChange={e => updateField('lead_time_days', e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-gray-300 rounded px-3 py-2" />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Sort</label>
                        <input type="number" value={formData.catalog_sort ?? ''} onChange={e => updateField('catalog_sort', e.target.value ? Number(e.target.value) : undefined)} className="w-full border border-gray-300 rounded px-3 py-2" />
                    </div>
                </div>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.is_active !== false} onChange={e => updateField('is_active', e.target.checked)} />
                    <span className="text-sm font-bold uppercase">Active in catalog</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!formData.catalog_featured} onChange={e => updateField('catalog_featured', e.target.checked)} />
                    <span className="text-sm font-bold uppercase">Featured</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!formData.customizable} onChange={e => updateField('customizable', e.target.checked)} />
                    <span className="text-sm font-bold uppercase">Customizable</span>
                </label>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="mt-6 flex items-center gap-2 bg-gray-900 text-white font-bold px-6 py-3 rounded uppercase text-sm hover:bg-black disabled:opacity-50"
            >
                <Save size={18} /> {loading ? 'Saving…' : 'Save entry'}
            </button>
        </form>
    );
}
