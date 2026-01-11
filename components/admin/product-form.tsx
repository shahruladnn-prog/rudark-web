'use client';

import { useState } from 'react';
import { Product } from '@/types';
import ImageUploader from './image-uploader';
import { Save, RefreshCw, ArrowLeft, Archive, Plus, Trash2, LayoutGrid, Tag, DollarSign, Image as ImageIcon, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveProduct } from '@/actions/product-actions';

export default function ProductForm({ initialData, categories = [] }: { initialData?: Product, categories?: any[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Product>>(initialData || {
        stock_status: 'IN_STOCK',
        images: [],
        is_featured: false,
        web_price: 0,
        category_slug: '',
        subcategory_slugs: [],
        parcel_size: 'flyers_l', // Default to common size
        content_type: 'general',
        markup_amount: 0
    });

    // We now use the PASSED categories
    const selectedCategory = categories.find(c => c.slug === formData.category_slug);
    const subcategories = selectedCategory ? (selectedCategory.subcategories || []) : [];

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
        <form onSubmit={handleSave} className="pb-20">

            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-[#121212] border-b border-gray-800 shadow-md mb-8 -mx-4 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/products" className="p-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider">
                            {initialData ? 'Edit Item' : 'New Item'}
                        </h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                            <span>{formData.sku || 'NO SKU'}</span>
                            <span className="text-gray-700">|</span>
                            <span>{formData.id || 'DRAFT'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 border border-gray-600 text-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-rudark-volt text-black px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors disabled:opacity-50"
                    >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="max-w-[1800px] mx-auto px-4 grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* Main Content (3 Columns) */}
                <div className="xl:col-span-3 space-y-8">

                    {/* Basic Data - High Density */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-700/50 pb-3">
                            <LayoutGrid size={16} className="text-rudark-volt" />
                            <h3 className="text-white text-sm font-bold uppercase">Core Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Product Name</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 focus:border-rudark-volt focus:outline-none text-sm font-bold"
                                    placeholder="Product Name"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Base SKU (Loyverse)</label>
                                <div className="flex">
                                    <input
                                        type="text"
                                        value={formData.sku || ''}
                                        onChange={(e) => updateField('sku', e.target.value)}
                                        className="w-full bg-black border border-gray-700 text-rudark-volt px-3 py-2 focus:border-rudark-volt focus:outline-none text-sm font-mono border-r-0"
                                        placeholder="SKU-001"
                                    />
                                    <button
                                        type="button"
                                        title="Check Loyverse Stock"
                                        className="bg-gray-800 border border-gray-700 px-3 text-gray-400 hover:text-white"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-1">
                            <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Description</label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={4}
                                className="w-full bg-black border border-gray-700 text-gray-300 px-3 py-2 focus:border-rudark-volt focus:outline-none text-sm"
                                placeholder="Product description..."
                            />
                        </div>
                    </div>

                    {/* Pricing Grid */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-700/50 pb-3">
                            <DollarSign size={16} className="text-rudark-volt" />
                            <h3 className="text-white text-sm font-bold uppercase">Pricing Strategy</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Retail Price (RM)</label>
                                <input
                                    type="number"
                                    value={formData.web_price || 0}
                                    onChange={(e) => updateField('web_price', parseFloat(e.target.value))}
                                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 focus:border-rudark-volt focus:outline-none font-bold text-lg"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-rudark-volt uppercase font-bold tracking-wider">Promo Price (RM)</label>
                                <input
                                    type="number"
                                    value={formData.promo_price || ''}
                                    onChange={(e) => updateField('promo_price', parseFloat(e.target.value))}
                                    className="w-full bg-black border border-gray-700 text-rudark-volt px-3 py-2 focus:border-rudark-volt focus:outline-none font-bold text-lg"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="col-span-2 flex items-center">
                                <p className="text-xs text-gray-500 border-l-2 border-gray-700 pl-3 italic">
                                    Setting a promo price will trigger sale badges and strikethrough pricing on the storefront automatically.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Variants Table - WIDE MODE */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-700/50 pb-3">
                            <div className="flex items-center gap-2">
                                <Tag size={16} className="text-rudark-volt" />
                                <h3 className="text-white text-sm font-bold uppercase">Variants & Inventory</h3>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = formData.options || [];
                                        updateField('options', [...current, { name: '', values: [] }]);
                                    }}
                                    className="text-[10px] bg-black border border-gray-600 text-white px-3 py-1 hover:border-white uppercase font-bold flex items-center gap-1 transition-colors"
                                >
                                    <Plus size={12} /> Add Option Group
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        // Generator Logic (Preserved)
                                        const options = formData.options || [];
                                        if (options.length === 0) return;
                                        const generateCombinations = (opts: any[], current: Record<string, string> = {}, index = 0): any[] => {
                                            if (index === opts.length) return [current];
                                            const opt = opts[index];
                                            const res = [];
                                            for (const val of opt.values) {
                                                res.push(...generateCombinations(opts, { ...current, [opt.name]: val }, index + 1));
                                            }
                                            return res;
                                        };
                                        const combos = generateCombinations(options);
                                        const newVariants = combos.map((c, i) => ({
                                            id: `var_${Date.now()}_${i}`,
                                            options: c,
                                            sku: `${formData.sku || 'SKU'}-${Object.values(c).join('-').toUpperCase()}`,
                                            price: formData.web_price || 0,
                                            stock_status: 'IN_STOCK'
                                        }));
                                        if (confirm("Regenerate variants? This will overwrite existing variant settings.")) {
                                            updateField('variants', newVariants);
                                        }
                                    }}
                                    className="text-[10px] bg-rudark-volt text-black px-3 py-1 hover:bg-white uppercase font-bold flex items-center gap-1 transition-colors"
                                >
                                    <RefreshCw size={12} /> Generate Variants
                                </button>
                            </div>
                        </div>

                        {/* Option Definitions */}
                        {formData.options && formData.options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-black/50 p-4 border border-gray-800">
                                {formData.options.map((opt, idx) => (
                                    <div key={idx} className="flex gap-2 items-start group">
                                        <div className="w-1/3">
                                            <label className="text-[9px] text-gray-500 uppercase">Option Name</label>
                                            <input
                                                value={opt.name}
                                                onChange={(e) => {
                                                    const current = [...(formData.options || [])];
                                                    current[idx].name = e.target.value;
                                                    updateField('options', current);
                                                }}
                                                className="w-full bg-[#121212] border border-gray-700 text-white text-xs px-2 py-1 focus:border-rudark-volt"
                                                placeholder="e.g. Size"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] text-gray-500 uppercase">Values (Comma Separated)</label>
                                            <input
                                                value={opt.values.join(', ')}
                                                onChange={(e) => {
                                                    const current = [...(formData.options || [])];
                                                    current[idx].values = e.target.value.split(',').map(s => s.trimStart());
                                                    updateField('options', current);
                                                }}
                                                className="w-full bg-[#121212] border border-gray-700 text-gray-300 text-xs px-2 py-1 font-mono focus:border-rudark-volt"
                                                placeholder="S, M, L"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const current = [...(formData.options || [])];
                                                current.splice(idx, 1);
                                                updateField('options', current);
                                            }}
                                            className="mt-5 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Variants Data Table */}
                        {(!formData.variants || formData.variants.length === 0) ? (
                            <div className="text-center py-12 text-gray-600 text-sm border border-dashed border-gray-800 bg-black/20">
                                No variants generated yet. Define options above and click <strong>Generate</strong>.
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-gray-800">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-[#121212] text-gray-500 font-bold text-[10px] uppercase tracking-wider border-b border-gray-800">
                                            <th className="py-3 px-4">Variant Info</th>
                                            <th className="py-3 px-4">SKU (Exact Match)</th>
                                            <th className="py-3 px-4 w-32">Price</th>
                                            <th className="py-3 px-4 w-32 text-rudark-volt">Promo</th>
                                            <th className="py-3 px-4 w-40">Status</th>
                                            <th className="py-3 px-4 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {formData.variants.map((v: any, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                <td className="py-2 px-4 font-bold text-white text-xs">
                                                    {Object.values(v.options).join(' / ')}
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        type="text"
                                                        value={v.sku}
                                                        onChange={(e) => {
                                                            const vars = [...(formData.variants || [])];
                                                            vars[idx].sku = e.target.value;
                                                            updateField('variants', vars);
                                                        }}
                                                        className="w-full bg-black border border-gray-700 text-rudark-volt px-2 py-1 focus:outline-none focus:border-white font-mono text-xs"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        type="number"
                                                        value={v.price}
                                                        onChange={(e) => {
                                                            const vars = [...(formData.variants || [])];
                                                            vars[idx].price = Number(e.target.value);
                                                            updateField('variants', vars);
                                                        }}
                                                        className="w-full bg-black border border-gray-700 text-white px-2 py-1 focus:outline-none focus:border-white font-mono text-xs"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <input
                                                        type="number"
                                                        value={v.promo_price || ''}
                                                        onChange={(e) => {
                                                            const vars = [...(formData.variants || [])];
                                                            vars[idx].promo_price = e.target.value ? Number(e.target.value) : undefined;
                                                            updateField('variants', vars);
                                                        }}
                                                        className="w-full bg-black border border-gray-700 text-rudark-volt px-2 py-1 focus:outline-none focus:border-white font-mono text-xs placeholder-gray-700"
                                                        placeholder="-"
                                                    />
                                                </td>
                                                <td className="py-2 px-4">
                                                    <select
                                                        value={v.stock_status}
                                                        onChange={(e) => {
                                                            const vars = [...(formData.variants || [])];
                                                            vars[idx].stock_status = e.target.value as any;
                                                            updateField('variants', vars);
                                                        }}
                                                        className={`w-full bg-black border border-gray-700 text-[10px] font-bold uppercase px-2 py-1 focus:outline-none ${v.stock_status === 'OUT' ? 'text-red-500 border-red-900' :
                                                            v.stock_status === 'ARCHIVED' ? 'text-gray-500 border-gray-700' : 'text-green-500 border-green-900'
                                                            }`}
                                                    >
                                                        <option value="IN_STOCK">Selling (Live)</option>
                                                        <option value="OUT">Sold Out</option>
                                                        <option value="ARCHIVED">Hidden</option>
                                                    </select>
                                                </td>
                                                <td className="py-2 px-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const vars = [...(formData.variants || [])];
                                                            vars.splice(idx, 1);
                                                            updateField('variants', vars);
                                                        }}
                                                        className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (Organization & Media) */}
                <div className="space-y-6">

                    {/* Categories Card */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-700/50 pb-2">
                            <Tag size={14} className="text-rudark-volt" />
                            <h3 className="text-white text-xs font-bold uppercase">Organization</h3>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Main Category</label>
                                <select
                                    value={formData.category_slug || ''}
                                    onChange={(e) => {
                                        updateField('category_slug', e.target.value);
                                        updateField('subcategory_slug', '');
                                    }}
                                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 text-xs uppercase focus:border-rudark-volt focus:outline-none"
                                >
                                    <option value="">Select...</option>
                                    {categories.map(cat => (
                                        <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Sub-Categories</label>
                                <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto border border-gray-800 bg-black p-2">
                                    {!formData.category_slug && <p className="text-[10px] text-gray-600 italic p-2">Select main category first</p>}
                                    {subcategories.map((sub: any) => {
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
                                                className={`cursor-pointer px-2 py-1.5 text-[10px] font-bold uppercase transition-colors flex items-center gap-2 ${isSelected ? 'text-white bg-rudark-volt/20 border-l-2 border-rudark-volt' : 'text-gray-500 hover:text-white border-l-2 border-transparent'}`}
                                            >
                                                {/* <div className={`w-3 h-3 border ${isSelected ? 'bg-rudark-volt border-rudark-volt' : 'border-gray-600'}`} /> */}
                                                {sub.name}
                                                {isSelected && <span className="ml-auto text-rudark-volt">✓</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Media Card */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-700/50 pb-2">
                            <ImageIcon size={14} className="text-rudark-volt" />
                            <h3 className="text-white text-xs font-bold uppercase">Media Gallery</h3>
                        </div>
                        <ImageUploader
                            images={formData.images || []}
                            onChange={(imgs) => updateField('images', imgs)}
                        />
                    </div>

                    {/* Status Card */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-5 shadow-sm">
                        <h3 className="text-white text-xs font-bold uppercase mb-4 border-b border-gray-700/50 pb-2">Visibility & Status</h3>

                        <div className="mb-4">
                            <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Stock Status</label>
                            <select
                                value={formData.stock_status}
                                onChange={(e) => updateField('stock_status', e.target.value)}
                                className={`w-full bg-black border border-gray-700 text-xs font-bold uppercase px-3 py-2 focus:outline-none ${formData.stock_status === 'OUT' ? 'text-red-500 border-red-900' :
                                    formData.stock_status === 'ARCHIVED' ? 'text-gray-500 border-gray-700' :
                                        formData.stock_status === 'CONTACT_US' ? 'text-blue-400 border-blue-900' :
                                            'text-green-500 border-green-900'
                                    }`}
                            >
                                <option value="IN_STOCK">Selling (Live)</option>
                                <option value="OUT">Sold Out</option>
                                <option value="CONTACT_US">Contact to Buy</option>
                                <option value="ARCHIVED">Hidden</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3 bg-black p-3 border border-gray-700">
                            <input
                                type="checkbox"
                                id="featured"
                                checked={formData.is_featured || false}
                                onChange={(e) => updateField('is_featured', e.target.checked)}
                                className="w-4 h-4 accent-rudark-volt"
                            />
                            <label htmlFor="featured" className="text-xs font-bold uppercase text-white cursor-pointer select-none">
                                Feature on Homepage
                            </label>
                        </div>
                    </div>

                    {/* Logistics Card */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-gray-700/50 pb-2">
                            <Truck size={14} className="text-rudark-volt" />
                            <h3 className="text-white text-xs font-bold uppercase">Logistics & ParcelAsia</h3>
                        </div>

                        <div className="space-y-4">

                            {/* Parcel Size & Content Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Parcel Size</label>
                                    <select
                                        value={formData.parcel_size || 'flyers_l'}
                                        onChange={(e) => updateField('parcel_size', e.target.value)}
                                        className="w-full bg-black border border-gray-700 text-white px-2 py-2 text-xs font-bold uppercase focus:border-rudark-volt focus:outline-none"
                                    >
                                        <option value="flyers_s">Flyers S</option>
                                        <option value="flyers_m">Flyers M</option>
                                        <option value="flyers_l">Flyers L</option>
                                        <option value="flyers_xl">Flyers XL</option>
                                        <option value="box">Box / Wrapped</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Content Type</label>
                                    <select
                                        value={formData.content_type || 'general'}
                                        onChange={(e) => updateField('content_type', e.target.value)}
                                        className="w-full bg-black border border-gray-700 text-white px-2 py-2 text-xs font-bold uppercase focus:border-rudark-volt focus:outline-none"
                                    >
                                        <option value="general">Fashion - General</option>
                                        <option value="outdoors">Lifestyle - Outdoors</option>
                                        <option value="sports">Fashion - Sports</option>
                                        <option value="accessories">Fashion - Accessories</option>
                                        <option value="muslimah">Fashion - Muslimah</option>
                                        <option value="health">Health & Beauty</option>
                                        <option value="gadget_general">Gadgets - General</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                            </div>


                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Weight (KG)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.weight || ''}
                                    onChange={(e) => updateField('weight', parseFloat(e.target.value))}
                                    className="w-full bg-black border border-gray-700 text-white px-3 py-2 text-xs font-mono focus:border-rudark-volt focus:outline-none"
                                    placeholder="0.5"
                                />
                            </div>

                            {/* Dimensions - Only show for Box */}
                            {formData.parcel_size === 'box' && (
                                <div className="p-3 bg-rudark-volt/5 border border-rudark-volt/20">
                                    <label className="text-[10px] text-rudark-volt uppercase font-bold block mb-1">Box Dimensions (CM) - REQUIRED</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <input
                                            type="number"
                                            placeholder="L"
                                            value={formData.length || ''}
                                            onChange={(e) => updateField('length', parseFloat(e.target.value))}
                                            className="bg-black border border-gray-700 text-white px-2 py-2 text-xs font-mono focus:border-rudark-volt focus:outline-none text-center"
                                        />
                                        <input
                                            type="number"
                                            placeholder="W"
                                            value={formData.width || ''}
                                            onChange={(e) => updateField('width', parseFloat(e.target.value))}
                                            className="bg-black border border-gray-700 text-white px-2 py-2 text-xs font-mono focus:border-rudark-volt focus:outline-none text-center"
                                        />
                                        <input
                                            type="number"
                                            placeholder="H"
                                            value={formData.height || ''}
                                            onChange={(e) => updateField('height', parseFloat(e.target.value))}
                                            className="bg-black border border-gray-700 text-white px-2 py-2 text-xs font-mono focus:border-rudark-volt focus:outline-none text-center"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-800"></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-green-500 uppercase font-bold block mb-1">Handling Fee (RM)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.handling_fee || ''}
                                        onChange={(e) => updateField('handling_fee', parseFloat(e.target.value))}
                                        className="w-full bg-black border border-gray-700 text-green-500 px-3 py-2 text-xs font-mono focus:border-green-500 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-green-500 uppercase font-bold block mb-1">Markup (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.shipping_markup_percent || ''}
                                        onChange={(e) => updateField('shipping_markup_percent', parseFloat(e.target.value))}
                                        className="w-full bg-black border border-gray-700 text-green-500 px-3 py-2 text-xs font-mono focus:border-green-500 focus:outline-none"
                                        placeholder="10"
                                    />
                                </div>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-1 italic">Fees & Markup are added to the shipping cost shown to customer.</p>
                        </div>
                    </div>

                    {/* Creation Metdata */}
                    {initialData && (
                        <div className="text-[10px] text-gray-600 font-mono p-2">
                            <p>ID: {initialData.id}</p>
                            <p>CREATED: {new Date().toLocaleDateString()}</p>
                        </div>
                    )}

                </div>

            </div>
        </form >
    );
}
