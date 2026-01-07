'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { saveCategory } from '@/actions/category-actions';
import ImageUploader from './image-uploader';

interface CategoryFormProps {
    initialData?: any;
    id?: string;
}

export default function CategoryForm({ initialData, id }: CategoryFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(initialData || {
        name: '',
        slug: '',
        category_name: '', // For mega menu title
        image: '',
        subcategories: []
    });

    const updateField = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSubcategoryChange = (index: number, field: string, value: string) => {
        const newSubs = [...(formData.subcategories || [])];
        if (!newSubs[index]) newSubs[index] = { name: '', slug: '' };
        newSubs[index][field] = value;
        // Auto-slug for subcat
        if (field === 'name' && !newSubs[index].slug) {
            newSubs[index].slug = value.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        }
        updateField('subcategories', newSubs);
    };

    const addSubcategory = () => {
        updateField('subcategories', [...(formData.subcategories || []), { name: '', slug: '' }]);
    };

    const removeSubcategory = (index: number) => {
        const newSubs = [...(formData.subcategories || [])];
        newSubs.splice(index, 1);
        updateField('subcategories', newSubs);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Ensure sync between name and category_name (legacy structure support)
        const payload = {
            ...formData,
            category_name: formData.name, // normalize
            id: id
        };

        const res = await saveCategory(payload);

        if (res.success) {
            alert("Category saved!");
            router.push('/admin/categories');
            router.refresh();
        } else {
            alert("Error: " + res.error);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-8 pb-20">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-rudark-grey pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/categories" className="p-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                            {id === 'new' ? 'New Category' : 'Edit Category'}
                        </h1>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-rudark-volt text-black px-8 py-3 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Category'}
                </button>
            </div>

            {/* Main Info */}
            <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-mono uppercase">Category Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-bold uppercase"
                            placeholder="e.g. APPAREL"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-400 font-mono uppercase">Slug (URL)</label>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => updateField('slug', e.target.value.toLowerCase())}
                            className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-mono text-sm"
                            placeholder="e.g. apparel"
                        />
                    </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-4 pt-4 border-t border-rudark-grey/30">
                    <h3 className="text-rudark-volt font-condensed font-bold uppercase tracking-wide">Category Visual</h3>
                    <p className="text-gray-400 text-xs font-mono">High-impact image for homepage grid (1200x800 recommended)</p>
                    <ImageUploader
                        images={formData.image ? [formData.image] : []}
                        onChange={(imgs) => updateField('image', imgs[0] || '')}
                    />
                </div>
            </div>

            {/* Subcategories */}
            <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-rudark-volt font-condensed font-bold uppercase tracking-wide">Sub-Categories</h3>
                    <button type="button" onClick={addSubcategory} className="text-xs font-bold uppercase text-white hover:text-rudark-volt flex items-center gap-1">
                        <Plus size={14} /> Add Sub
                    </button>
                </div>

                <div className="space-y-4">
                    {(formData.subcategories || []).map((sub: any, i: number) => (
                        <div key={i} className="flex gap-4 items-start">
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={sub.name}
                                    onChange={(e) => handleSubcategoryChange(i, 'name', e.target.value)}
                                    className="bg-rudark-matte text-white px-3 py-2 border border-rudark-grey focus:border-rudark-volt focus:outline-none text-sm uppercase"
                                    placeholder="Name (e.g. Shirts)"
                                />
                                <input
                                    type="text"
                                    value={sub.slug}
                                    onChange={(e) => handleSubcategoryChange(i, 'slug', e.target.value)}
                                    className="bg-rudark-matte text-gray-400 px-3 py-2 border border-rudark-grey focus:border-rudark-volt focus:outline-none text-sm font-mono"
                                    placeholder="slug"
                                />
                            </div>
                            <button type="button" onClick={() => removeSubcategory(i)} className="p-2 text-gray-500 hover:text-red-500">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {(!formData.subcategories || formData.subcategories.length === 0) && (
                        <p className="text-gray-600 text-xs font-mono italic">No sub-categories defined.</p>
                    )}
                </div>
            </div>

        </form>
    );
}
