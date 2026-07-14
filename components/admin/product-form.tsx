'use client';

import { useState } from 'react';
import { Product } from '@/types';
import ImageUploader from './image-uploader';
import { 
    Save, RefreshCw, ArrowLeft, Archive, Plus, Trash2, LayoutGrid,
    Tag, DollarSign, Image as ImageIcon, Truck, Share2, Layers, History, Calendar,
    Eye, EyeOff, Home, ChevronDown, Globe
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveProduct } from '@/actions/product-actions';
import { fetchLoyverseProductBySku } from '@/actions/admin-sync';
import { useToast } from '@/components/ui/toast';

export default function ProductForm({ initialData, categories = [] }: { initialData?: Product, categories?: any[] }) {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [syncingSku, setSyncingSku] = useState(false);
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
            showToast('success', 'Product saved!');
            router.push('/admin/products');
        } else {
            showToast('error', result.error || 'Failed to save product');
            setLoading(false);
        }
    };

    const handleSyncSku = async () => {
        if (!formData.sku) {
            showToast('warning', 'Please enter a SKU first');
            return;
        }

        setSyncingSku(true);
        try {
            const result = await fetchLoyverseProductBySku(formData.sku);
            if (result.success && result.data) {
                const lvData = result.data;
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || lvData.name,
                    description: prev.description || lvData.description,
                    web_price: lvData.web_price,
                    variants: lvData.variants,
                    stock_quantity: lvData.stock_quantity
                }));
                showToast('success', 'Data synced from Loyverse!');
            } else {
                showToast('error', result.error || 'Failed to sync SKU');
            }
        } catch (error) {
            console.error('[Sync Sku] Error:', error);
            showToast('error', 'An error occurred during sync');
        }
        setSyncingSku(false);
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
                                        title="Sync from Loyverse"
                                        onClick={handleSyncSku}
                                        disabled={syncingSku}
                                        className="bg-gray-800 border border-gray-700 px-3 text-gray-400 hover:text-white disabled:opacity-50"
                                    >
                                        <RefreshCw size={14} className={syncingSku ? 'animate-spin' : ''} />
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
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Cost Price / COGS (RM)</label>
                                <input
                                    type="number"
                                    value={formData.cost_price || ''}
                                    onChange={(e) => updateField('cost_price', parseFloat(e.target.value) || undefined)}
                                    className="w-full bg-black border border-gray-700 text-gray-400 px-3 py-2 focus:border-gray-500 focus:outline-none font-mono text-base"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-800/50">
                            <div className="space-y-1">
                                <label className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">Reorder Point</label>
                                <input
                                    type="number"
                                    value={formData.reorder_point ?? ''}
                                    onChange={(e) => updateField('reorder_point', e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full bg-black border border-gray-700 text-amber-500 px-3 py-2 focus:border-amber-500 focus:outline-none font-bold text-lg"
                                    placeholder="5"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Safety Stock</label>
                                <input
                                    type="number"
                                    value={formData.safety_stock ?? ''}
                                    onChange={(e) => updateField('safety_stock', e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full bg-black border border-gray-700 text-blue-400 px-3 py-2 focus:border-blue-400 focus:outline-none font-bold text-lg"
                                    placeholder="0"
                                />
                            </div>
                            <div className="md:col-span-2 flex items-center">
                                <p className="text-xs text-gray-500 border-l-2 border-gray-700 pl-3 italic">
                                    Reorder Point triggers low stock warnings. Safety Stock is an internal buffer level.
                                </p>
                            </div>
                        </div>

                        {/* Channel Allocation (PHASE 4) */}
                        <div className="mt-8 pt-6 border-t border-gray-800">
                            <div className="flex items-center gap-2 mb-4">
                                <Share2 size={14} className="text-rudark-volt" />
                                <h4 className="text-white text-[11px] font-bold uppercase tracking-widest">Channel Stock Allocation (Soft)</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-black/40 border border-gray-800 p-3">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Website</label>
                                    <input
                                        type="number"
                                        value={formData.stock_web ?? ''}
                                        onChange={(e) => updateField('stock_web', e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full bg-transparent border-none text-white focus:ring-0 font-mono text-sm p-0"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="bg-black/40 border border-gray-800 p-3">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Shopee</label>
                                    <input
                                        type="number"
                                        value={formData.stock_shopee ?? ''}
                                        onChange={(e) => updateField('stock_shopee', e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full bg-transparent border-none text-rudark-volt focus:ring-0 font-mono text-sm p-0"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="bg-black/40 border border-gray-800 p-3">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Lazada</label>
                                    <input
                                        type="number"
                                        value={formData.stock_lazada ?? ''}
                                        onChange={(e) => updateField('stock_lazada', e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full bg-transparent border-none text-rudark-volt focus:ring-0 font-mono text-sm p-0"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="bg-black/40 border border-gray-800 p-3">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">TikTok</label>
                                    <input
                                        type="number"
                                        value={formData.stock_tiktok ?? ''}
                                        onChange={(e) => updateField('stock_tiktok', e.target.value ? parseInt(e.target.value) : undefined)}
                                        className="w-full bg-transparent border-none text-rudark-volt focus:ring-0 font-mono text-sm p-0"
                                        placeholder="0"
                                    />
                                </div>
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
                                            stock_status: 'IN_STOCK',
                                            stock_quantity: 0,
                                            reserved_quantity: 0,
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
                        <>
                            {/* Image assignment tip */}
                            <div className="mb-3 flex items-start gap-2 text-[10px] text-gray-500 bg-rudark-volt/5 border border-rudark-volt/20 px-3 py-2">
                                <span className="text-rudark-volt flex-shrink-0">📷</span>
                                <span>
                                    <strong className="text-white">Assign variant images:</strong> Upload photos to the Media Gallery (above), then click a thumbnail in the <span className="text-rudark-volt">Image</span> column to assign it to that variant. The highlighted photo (volt border ✓) is the one that shows when that variant is selected on the product page.
                                </span>
                            </div>
                            <div className="overflow-x-auto border border-gray-800">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-[#121212] text-gray-500 font-bold text-[10px] uppercase tracking-wider border-b border-gray-800">
                                            <th className="py-3 px-4">Variant</th>
                                            <th className="py-3 px-4">SKU</th>
                                            <th className="py-3 px-4 w-32">Price</th>
                                            <th className="py-3 px-4 w-32 text-rudark-volt">Promo</th>
                                            <th className="py-3 px-4 w-40">Status</th>
                                            <th className="py-3 px-4 text-rudark-volt">
                                                📷 Image
                                                <span className="ml-1 text-gray-600 normal-case font-normal">(click to assign)</span>
                                            </th>
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
                                                {/* Variant Image Assignment — click a thumbnail to assign */}
                                                <td className="py-2 px-4">
                                                    {(!formData.images || formData.images.length === 0) ? (
                                                        <span className="text-gray-600 text-[9px] italic">Upload images above first</span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {(formData.images as string[]).map((img, i) => {
                                                                const isSelected = v.image === img;
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        title={isSelected ? `Photo ${i + 1} — assigned (click to remove)` : `Assign Photo ${i + 1}`}
                                                                        onClick={() => {
                                                                            const vars = [...(formData.variants || [])];
                                                                            vars[idx].image = isSelected ? undefined : img;
                                                                            updateField('variants', vars);
                                                                        }}
                                                                        className={`relative w-10 h-10 flex-shrink-0 border-2 overflow-hidden transition-all ${
                                                                            isSelected
                                                                                ? 'border-rudark-volt ring-1 ring-rudark-volt'
                                                                                : 'border-gray-700 opacity-40 hover:opacity-90 hover:border-gray-400'
                                                                        }`}
                                                                    >
                                                                        <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                                                        {isSelected && (
                                                                            <div className="absolute inset-0 bg-rudark-volt/20 flex items-center justify-center">
                                                                                <span className="text-rudark-volt text-[10px] font-bold">✓</span>
                                                                            </div>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
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
                        </>)}
                    </div>

                    {/* Channel Stock Allocation */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5 border-b border-gray-700/50 pb-3">
                            <Globe size={14} className="text-rudark-volt" />
                            <h3 className="text-white text-sm font-bold uppercase">Stock by Channel</h3>
                            <span className="text-[10px] text-gray-600 ml-1 font-normal normal-case">Informational — manual tracking only</span>
                        </div>

                        {/* Fixed channel fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {[
                                { label: '🌐 Website', field: 'stock_quantity', note: 'Online orders — auto-deducted on sale' },
                                { label: '🛒 Shopee', field: 'stock_shopee', note: 'Shopee shop allocation' },
                                { label: '📱 TikTok', field: 'stock_tiktok', note: 'TikTok shop allocation' },
                                { label: '📦 Lazada', field: 'stock_lazada', note: 'Lazada allocation' },
                            ].map(({ label, field, note }) => (
                                <div key={field} className="space-y-1">
                                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">{label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={(formData as any)[field] ?? 0}
                                        onChange={e => updateField(field as keyof Product, parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#121212] border border-gray-700 text-white px-3 py-2 text-sm font-mono focus:border-rudark-volt focus:outline-none"
                                    />
                                    <p className="text-[9px] text-gray-600">{note}</p>
                                </div>
                            ))}
                        </div>

                        {/* Physical store / pop-up locations */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">🏪 Physical Locations</label>
                                <button
                                    type="button"
                                    onClick={() => updateField('store_allocations', [...(formData.store_allocations || []), { store_name: '', qty: 0 }])}
                                    className="text-[10px] text-rudark-volt hover:text-white uppercase font-bold flex items-center gap-1"
                                >
                                    <Plus size={10} /> Add Location
                                </button>
                            </div>
                            {(formData.store_allocations || []).length === 0 ? (
                                <p className="text-[10px] text-gray-600 italic">No physical locations added yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {(formData.store_allocations || []).map((loc, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={loc.store_name}
                                                onChange={e => {
                                                    const locs = [...(formData.store_allocations || [])];
                                                    locs[i] = { ...locs[i], store_name: e.target.value };
                                                    updateField('store_allocations', locs);
                                                }}
                                                placeholder="Location name (e.g. Gopeng Store)"
                                                className="flex-1 bg-[#121212] border border-gray-700 text-white px-3 py-1.5 text-xs focus:border-rudark-volt focus:outline-none"
                                            />
                                            <input
                                                type="number"
                                                min="0"
                                                value={loc.qty}
                                                onChange={e => {
                                                    const locs = [...(formData.store_allocations || [])];
                                                    locs[i] = { ...locs[i], qty: parseInt(e.target.value) || 0 };
                                                    updateField('store_allocations', locs);
                                                }}
                                                className="w-20 bg-[#121212] border border-gray-700 text-white px-2 py-1.5 text-xs font-mono focus:border-rudark-volt focus:outline-none text-center"
                                            />
                                            <span className="text-[9px] text-gray-600">units</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const locs = [...(formData.store_allocations || [])];
                                                    locs.splice(i, 1);
                                                    updateField('store_allocations', locs);
                                                }}
                                                className="text-gray-700 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Total summary */}
                        {(() => {
                            const web = (formData as any).stock_quantity ?? 0;
                            const shopee = (formData as any).stock_shopee ?? 0;
                            const tiktok = (formData as any).stock_tiktok ?? 0;
                            const lazada = (formData as any).stock_lazada ?? 0;
                            const physical = (formData.store_allocations || []).reduce((s, l) => s + (l.qty || 0), 0);
                            const total = web + shopee + tiktok + lazada + physical;
                            return (
                                <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
                                    <span className="text-xs text-gray-500 font-mono">
                                        Total allocated: <span className="text-white font-bold">{total}</span> units
                                    </span>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Inventory Lots (PHASE 4) — hidden until implemented */}
                    <div className="hidden bg-[#1a1a1a] border border-gray-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-700/50 pb-3">
                            <div className="flex items-center gap-2">
                                <Layers size={16} className="text-rudark-volt" />
                                <h3 className="text-white text-sm font-bold uppercase">Inventory Lots (FIFO Tracking)</h3>
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono">
                                Total Value: RM {(formData.cost_lots?.reduce((acc, lot) => acc + (lot.quantity * lot.cost_price), 0) || 0).toLocaleString()}
                            </div>
                        </div>

                        {!formData.cost_lots || formData.cost_lots.length === 0 ? (
                            <div className="text-center py-10 bg-black/20 border border-dashed border-gray-800">
                                <History size={24} className="mx-auto text-gray-700 mb-2" />
                                <p className="text-gray-500 text-xs uppercase tracking-widest font-bold">No active lots recorded</p>
                                <p className="text-[10px] text-gray-600 mt-1">Lots are automatically created during Stock Receiving.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-gray-800">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[#121212] text-gray-500 font-bold uppercase tracking-wider border-b border-gray-800">
                                            <th className="py-2 px-4">Rec. Date</th>
                                            <th className="py-2 px-4">Batch / Supplier</th>
                                            <th className="py-2 px-4 text-right">Qty Left</th>
                                            <th className="py-2 px-4 text-right">Unit Cost</th>
                                            <th className="py-2 px-4 text-right">Total Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {formData.cost_lots.map((lot) => (
                                            <tr key={lot.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-2 px-4 text-gray-400 font-mono">
                                                    {new Date(lot.created_at?.seconds * 1000 || Date.now()).toLocaleDateString()}
                                                </td>
                                                <td className="py-2 px-4">
                                                    <div className="text-white font-bold">{lot.batch_number || 'SYSTEM_LOT'}</div>
                                                    <div className="text-[10px] text-gray-500">{lot.supplier_name || 'Generic Entry'}</div>
                                                </td>
                                                <td className="py-2 px-4 text-right font-bold text-rudark-volt">
                                                    {lot.quantity}
                                                </td>
                                                <td className="py-2 px-4 text-right text-gray-300">
                                                    RM {lot.cost_price.toFixed(2)}
                                                </td>
                                                <td className="py-2 px-4 text-right text-white">
                                                    RM {(lot.quantity * lot.cost_price).toFixed(2)}
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
                            thumbnails={formData.image_thumbnails}
                            onChangeThumbnails={(thumbs) => updateField('image_thumbnails', thumbs)}
                        />
                    </div>

                    {/* Status Card */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-5 shadow-sm">
                        <h3 className="text-white text-xs font-bold uppercase mb-4 border-b border-gray-700/50 pb-2">Visibility & Status</h3>

                        <div className="mb-6">
                            <button
                                type="button"
                                onClick={() => updateField('is_public', !formData.is_public)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded border transition-all ${
                                    formData.is_public 
                                    ? 'bg-green-500/10 border-green-500/50 text-green-500' 
                                    : 'bg-red-500/10 border-red-500/50 text-red-500'
                                }`}
                            >
                                <span className="flex items-center gap-2 font-bold text-[10px] uppercase">
                                    {formData.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                                    {formData.is_public ? 'Public (Live)' : 'Private (Draft)'}
                                </span>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.is_public ? 'bg-green-500' : 'bg-red-500'}`}>
                                    <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${formData.is_public ? 'right-1' : 'left-1'}`} />
                                </div>
                            </button>
                            <p className="text-[9px] text-gray-500 mt-2 italic text-center">
                                {formData.is_public ? 'Visible to customers on the website.' : 'Hidden from public store pages.'}
                            </p>
                        </div>

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

                    {/* Catalog display */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-5 shadow-sm">
                        <h3 className="text-white text-xs font-bold uppercase mb-4 border-b border-gray-700/50 pb-2">Catalog Display</h3>
                        <div className="mb-4">
                            <button type="button" onClick={() => updateField('show_in_catalog', formData.show_in_catalog === false)} className={`w-full flex justify-between px-4 py-3 rounded border text-[10px] font-bold uppercase ${formData.show_in_catalog !== false ? 'bg-rudark-volt/10 border-rudark-volt/50 text-rudark-volt' : 'border-gray-700 text-gray-500'}`}>
                                <span>Show in catalog</span><span>{formData.show_in_catalog !== false ? 'ON' : 'OFF'}</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Purchase mode</label><select value={formData.purchase_mode || ''} onChange={(e) => updateField('purchase_mode', e.target.value || undefined)} className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2"><option value="">Auto</option><option value="online">Online</option><option value="inquire">Inquire</option><option value="display">Display</option></select></div>
                            <div><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Price display</label><select value={formData.price_display || ''} onChange={(e) => updateField('price_display', e.target.value || undefined)} className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2"><option value="">Auto</option><option value="fixed">Fixed</option><option value="from">From</option><option value="quote">Quote</option><option value="hidden">Hidden</option></select></div>
                        </div>
                        <div className="mb-4"><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Catalog tags</label><input type="text" value={(formData.catalog_tags || []).join(', ')} onChange={(e) => updateField('catalog_tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2" /></div>
                        <div className="mb-4"><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Use cases</label><div className="flex flex-wrap gap-2">{(['retail','events','corporate'] as const).map(uc => { const sel = formData.use_cases?.includes(uc); return <button key={uc} type="button" onClick={() => { const c = formData.use_cases || []; updateField('use_cases', sel ? c.filter(x => x !== uc) : [...c, uc]); }} className={`text-[10px] uppercase px-2 py-1 border ${sel ? 'border-rudark-volt text-rudark-volt' : 'border-gray-700 text-gray-500'}`}>{uc}</button>; })}</div></div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div><label className="text-[10px] text-gray-500 uppercase block mb-1">MOQ</label><input type="number" value={formData.moq ?? ''} onChange={(e) => updateField('moq', e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2" /></div>
                            <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Lead days</label><input type="number" value={formData.lead_time_days ?? ''} onChange={(e) => updateField('lead_time_days', e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2" /></div>
                            <div><label className="text-[10px] text-gray-500 uppercase block mb-1">Sort</label><input type="number" value={formData.catalog_sort ?? ''} onChange={(e) => updateField('catalog_sort', e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2" /></div>
                        </div>
                        <div className="flex items-center gap-3 bg-black p-3 border border-gray-700 mb-2"><input type="checkbox" id="customizable" checked={!!formData.customizable} onChange={(e) => updateField('customizable', e.target.checked)} className="accent-rudark-volt" /><label htmlFor="customizable" className="text-xs uppercase text-white">Customizable</label></div>
                        <div className="flex items-center gap-3 bg-black p-3 border border-gray-700"><input type="checkbox" id="catalog_featured" checked={!!formData.catalog_featured} onChange={(e) => updateField('catalog_featured', e.target.checked)} className="accent-rudark-volt" /><label htmlFor="catalog_featured" className="text-xs uppercase text-white">Featured in catalog</label></div>
                    </div>

                    {/* Pre-Order Card */}
                    <div className="bg-[#1a1a1a] border border-gray-800 p-5 shadow-sm">
                        <h3 className="text-white text-xs font-bold uppercase mb-4 border-b border-gray-700/50 pb-2">Pre-Order</h3>
                        <div className="flex items-center gap-3 bg-black p-3 border border-gray-700 mb-4">
                            <input
                                type="checkbox"
                                id="is_pre_order"
                                checked={!!formData.is_pre_order}
                                onChange={(e) => updateField('is_pre_order', e.target.checked)}
                                className="w-4 h-4 accent-rudark-volt"
                            />
                            <label htmlFor="is_pre_order" className="text-xs font-bold uppercase text-white cursor-pointer select-none">
                                Enable Pre-Order (deposit now, balance later)
                            </label>
                        </div>
                        {formData.is_pre_order && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Deposit %</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={formData.pre_order_deposit_percent ?? ''}
                                        onChange={(e) => updateField('pre_order_deposit_percent', e.target.value ? Number(e.target.value) : undefined)}
                                        placeholder="30"
                                        className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Estimated Availability</label>
                                    <input
                                        type="text"
                                        value={formData.pre_order_eta || ''}
                                        onChange={(e) => updateField('pre_order_eta', e.target.value)}
                                        placeholder="September 2026"
                                        className="w-full bg-black border border-gray-700 text-white text-xs px-2 py-2"
                                    />
                                </div>
                            </div>
                        )}
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
        </form>
    );
}
