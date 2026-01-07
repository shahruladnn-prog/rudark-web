'use client';

import { useState } from 'react';
import { Product } from '@/types';
import { CATEGORY_MAP } from '@/lib/categories';
import ImageUploader from './image-uploader';
import { Save, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveProduct } from '@/actions/product-actions';

export default function ProductForm({ initialData }: { initialData?: Product }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>(initialData || {
        stock_status: 'IN_STOCK',
        images: [],
        is_featured: false,
        web_price: 0,
        category_slug: '',
        subcategory_slugs: []
    });

    // Calculate available subcategories based on selected category
    const selectedCategory = CATEGORY_MAP.main_navigation.find(c => c.slug === formData.category_slug);
    const subcategories = selectedCategory ? selectedCategory.subcategories : [];

    const updateField = (field: keyof Product, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const result = await saveProduct({
            ...formData,
            id: initialData?.id
        });

        if (result.success) {
            alert("Product saved successfully!");
            router.push('/admin/products');
            router.refresh();
        } else {
            alert("Error saving: " + result.error);
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-8 max-w-5xl mx-auto pb-20">

            {/* Header Actions */}
            <div className="flex items-center justify-between border-b border-rudark-grey pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/products" className="p-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-condensed font-bold text-white uppercase">
                            {initialData ? 'Edit Product' : 'New Product'}
                        </h1>
                        <p className="text-gray-400 font-mono text-xs">
                            {initialData?.sku ? `SKU: ${initialData.sku}` : 'Creating new draft'}
                        </p>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-rudark-volt text-black px-8 py-3 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Basic Info */}
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-4">
                        <h3 className="text-rudark-volt font-condensed font-bold uppercase tracking-wide">Details</h3>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-mono uppercase">Product Name</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-bold uppercase text-lg"
                                placeholder="ENTER PRODUCT NAME"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-mono uppercase">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={6}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 text-sm leading-relaxed"
                                placeholder="Detailed product description..."
                            />
                        </div>
                    </div>

                    {/* Images */}
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-4">
                        <h3 className="text-rudark-volt font-condensed font-bold uppercase tracking-wide">Gallery</h3>
                        <ImageUploader
                            images={formData.images || []}
                            onChange={(imgs) => updateField('images', imgs)}
                        />
                    </div>

                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">

                    {/* Organization */}
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-4">
                        <h3 className="text-rudark-volt font-condensed font-bold uppercase tracking-wide">Categories</h3>

                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-mono uppercase">Main Category</label>
                            <select
                                value={formData.category_slug || ''}
                                onChange={(e) => {
                                    updateField('category_slug', e.target.value);
                                    updateField('subcategory_slug', ''); // Reset subcat
                                }}
                                className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none font-mono uppercase text-sm"
                            >
                                <option value="">Select Category...</option>
                                {CATEGORY_MAP.main_navigation.map(cat => (
                                    <option key={cat.slug} value={cat.slug}>{cat.category_name}</option>
                                ))}
                            </select>
                        </div>


                        <div className="space-y-3">
                            <label className="text-xs text-gray-400 font-mono uppercase">Sub-Categories (Select All That Apply)</label>

                            <div className="grid grid-cols-2 gap-2 bg-rudark-matte p-3 rounded-sm border border-rudark-grey h-40 overflow-y-auto">
                                {!formData.category_slug && (
                                    <p className="col-span-2 text-xs text-gray-500 italic text-center py-4">Select a category first</p>
                                )}
                                {subcategories.map(sub => {
                                    const isSelected = (formData.subcategory_slugs || []).includes(sub.slug);
                                    return (
                                        <div
                                            key={sub.slug}
                                            onClick={() => {
                                                const current = formData.subcategory_slugs || [];
                                                const start = current.includes(sub.slug)
                                                    ? current.filter(s => s !== sub.slug)
                                                    : [...current, sub.slug];
                                                updateField('subcategory_slugs', start);
                                            }}
                                            className={`
                                                cursor-pointer px-2 py-1.5 rounded-sm border text-xs font-mono uppercase transition-colors
                                                ${isSelected
                                                    ? 'bg-rudark-volt/20 border-rudark-volt text-white'
                                                    : 'bg-black/20 border-transparent text-gray-400 hover:text-white hover:bg-black/40'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-[2px] border ${isSelected ? 'bg-rudark-volt border-rudark-volt' : 'border-gray-600'}`}>
                                                    {isSelected && <div className="w-full h-full flex items-center justify-center text-[8px] text-black font-bold">✓</div>}
                                                </div>
                                                {sub.name}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-gray-500">
                                Selected: <span className="text-rudark-volt">{(formData.subcategory_slugs || []).length}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-rudark-grey/30">
                            <input
                                type="checkbox"
                                id="featured"
                                checked={formData.is_featured || false}
                                onChange={(e) => updateField('is_featured', e.target.checked)}
                                className="w-5 h-5 accent-rudark-volt bg-rudark-matte border-rudark-grey rounded-sm"
                            />
                            <label htmlFor="featured" className="text-sm font-bold uppercase text-white cursor-pointer select-none">
                                Mark as Featured
                            </label>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-4">
                        <h3 className="text-rudark-volt font-condensed font-bold uppercase tracking-wide">Pricing</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-mono uppercase">Retail (RM)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.web_price || 0}
                                    onChange={(e) => updateField('web_price', parseFloat(e.target.value))}
                                    className="w-full bg-rudark-matte text-white px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none font-bold font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-rudark-volt font-mono uppercase">Promo (RM)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.promo_price || ''}
                                    onChange={(e) => updateField('promo_price', parseFloat(e.target.value))}
                                    className="w-full bg-rudark-matte text-rudark-volt px-4 py-3 border border-rudark-grey focus:border-rudark-volt focus:outline-none font-bold font-mono"
                                    placeholder="OPTIONAL"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sync Logic */}
                    <div className="bg-rudark-carbon p-6 rounded-sm border border-rudark-grey space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-white font-condensed font-bold uppercase tracking-wide">Inventory</h3>
                            <span className={`text-xs font-bold px-2 py-1 rounded-sm ${formData.stock_status === 'IN_STOCK' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                                }`}>{formData.stock_status}</span>
                        </div>

                        <div className="p-4 bg-rudark-matte rounded-sm border border-rudark-grey/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-xs font-mono uppercase">Loyverse SKU</span>
                                <input
                                    type="text"
                                    value={formData.sku || ''}
                                    onChange={(e) => updateField('sku', e.target.value)}
                                    className="bg-transparent text-white font-mono text-xs border-b border-gray-700 focus:border-rudark-volt focus:outline-none w-32 px-1"
                                    placeholder="ENTER SKU"
                                />
                            </div>
                            <p className="text-[10px] text-rudark-volt mb-2 opacity-80">* Copy exact SKU from Loyverse to link stock.</p>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-xs font-mono uppercase">Variant ID</span>
                                <span className="text-white font-mono text-xs">{formData.loyverse_variant_id?.substring(0, 8) || 'N/A'}...</span>
                            </div>
                        </div>

                        <button type="button" className="w-full flex items-center justify-center gap-2 py-3 border border-rudark-grey text-gray-300 hover:text-rudark-volt hover:border-rudark-volt transition-colors uppercase font-bold text-sm tracking-wide">
                            <RefreshCw size={16} />
                            Check Live Stock
                        </button>
                    </div>

                </div>

            </div>
        </form>
    );
}
