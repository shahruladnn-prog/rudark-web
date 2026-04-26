'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react';
import { getCategories, deleteCategory } from '@/actions/category-actions';
import { seedCategories } from '@/actions/seed-categories';
import { useToast } from '@/components/ui/toast';

export default function CategoriesPage() {
    const { showToast } = useToast();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        const data = await getCategories();
        setCategories(data);
        setLoading(false);
    };

    const handleSeed = async () => {
        setLoading(true);
        try {
            const res = await seedCategories();
            if (res.success) {
                // @ts-ignore
                showToast('success', `Created ${res.count} categories successfully`);
                await load();
            } else {
                showToast('error', 'Error seeding: ' + res.error);
            }
        } catch (e) {
            showToast('error', 'Error invoking action: ' + e);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will not delete products, but will hide them from the menu.")) return;
        await deleteCategory(id);
        load();
    };

    return (
        <div className="max-w-4xl pb-20">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Category Manager</h1>
                    <p className="text-sm text-gray-400">Organize website navigation and product structure</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={async () => {
                        const { testDatabaseConnection } = await import('@/actions/test-db');
                        const res = await testDatabaseConnection();
                        showToast('info', JSON.stringify(res));
                    }} className="px-3 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300">
                        Test DB
                    </button>
                    <button onClick={handleSeed}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 rounded text-sm hover:border-gray-300">
                        <FolderTree size={15} /> Reset to Defaults
                    </button>
                    <Link href="/admin/categories/new"
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
                        <Plus size={15} /> New Category
                    </Link>
                </div>
            </div>

            <div className="space-y-3">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                                <FolderTree size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                <p className="text-xs text-gray-400 font-mono">/{cat.slug} • {cat.subcategories?.length || 0} subcategories</p>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/admin/categories/${cat.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                <Edit size={15} />
                            </Link>
                            <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    </div>
                ))}

                {loading && <div className="text-center text-gray-400 text-sm py-10">Loading…</div>}

                {!loading && categories.length === 0 && (
                    <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-lg">
                        <FolderTree size={40} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-400 mb-3 text-sm">No categories found.</p>
                        <Link href="/admin/categories/new" className="text-blue-600 font-medium text-sm hover:underline">Create your first category</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
