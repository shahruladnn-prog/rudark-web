import Link from 'next/link';
import { getCatalogEntries } from '@/actions/catalog-actions';
import { Plus, Pencil } from 'lucide-react';

export default async function AdminCatalogEntriesPage() {
    const entries = await getCatalogEntries();

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Catalog Entries</h1>
                    <p className="text-gray-500 text-sm mt-1">Services & capabilities shown in the public catalog (not sold online)</p>
                </div>
                <Link
                    href="/admin/catalog-entries/new"
                    className="flex items-center gap-2 bg-gray-900 text-white font-bold px-4 py-2 rounded text-sm uppercase hover:bg-black"
                >
                    <Plus size={16} /> New entry
                </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-4 py-3 font-bold uppercase text-xs text-gray-500">Title</th>
                            <th className="text-left px-4 py-3 font-bold uppercase text-xs text-gray-500">Slug</th>
                            <th className="text-left px-4 py-3 font-bold uppercase text-xs text-gray-500">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-12 text-center text-gray-400 uppercase text-xs">
                                    No catalog entries yet
                                </td>
                            </tr>
                        ) : (
                            entries.map((entry: { id: string; title?: string; slug?: string; is_active?: boolean }) => (
                                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{entry.title}</td>
                                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{entry.slug}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${entry.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                            {entry.is_active !== false ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link href={`/admin/catalog-entries/${entry.id}`} className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-xs font-bold uppercase">
                                            <Pencil size={14} /> Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
