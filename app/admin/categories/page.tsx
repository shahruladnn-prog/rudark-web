'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react';
import { getCategories, deleteCategory } from '@/actions/category-actions';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const data = await getCategories();
        setCategories(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will not delete products, but will hide them from the menu.")) return;
        await deleteCategory(id);
        load();
    }

    return (
        <div className="max-w-7xl mx-auto pb-20">

            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Category <span className="text-rudark-volt">Manager</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Organize website navigation and product structure.
                    </p>
                </div>
                <Link href="/admin/categories/new" className="flex items-center gap-2 bg-rudark-volt text-black px-6 py-2 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors">
                    <Plus size={18} />
                    New Category
                </Link>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {categories.map((cat) => (
                    <div key={cat.id} className="bg-rudark-carbon p-6 border border-rudark-grey rounded-sm flex items-center justify-between group hover:border-rudark-volt transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-rudark-matte rounded-sm text-rudark-volt">
                                <FolderTree size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-condensed font-bold text-white uppercase">{cat.name}</h3>
                                <p className="text-xs text-gray-500 font-mono uppercase">/{cat.slug} • {cat.subcategories?.length || 0} Subcategories</p>
                            </div>
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/admin/categories/${cat.id}`} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <Edit size={18} />
                            </Link>
                            <button
                                onClick={() => handleDelete(cat.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {loading && <div className="text-center text-gray-500 py-10">Loading Structure...</div>}

                {!loading && categories.length === 0 && (
                    <div className="text-center py-20 bg-rudark-carbon border border-rudark-grey border-dashed rounded-sm">
                        <p className="text-gray-400 mb-4">No categories found.</p>
                        <Link href="/admin/categories/new" className="text-rudark-volt font-bold uppercase text-sm hover:underline">Create your first category</Link>
                    </div>
                )}
            </div>

        </div>
    );
}
