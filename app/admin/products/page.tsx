import { adminDb } from '@/lib/firebase-admin';
import Link from 'next/link';
import { Product } from '@/types';
import { Edit, Trash2, RefreshCw, Search, Plus } from 'lucide-react';
import SyncButton from '@/components/admin/sync-button';

export const dynamic = 'force-dynamic';

async function getProducts() {
    const productsRef = adminDb.collection('products');
    const snapshot = await productsRef.orderBy('updated_at', 'desc').get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as Product[];
}

export default async function AdminProductsPage() {
    const products = await getProducts();

    return (
        <div className="space-y-8">

            {/* Header */}
            <div className="flex justify-between items-end border-b border-rudark-grey pb-6">
                <div>
                    <h1 className="text-4xl font-condensed font-bold text-white uppercase mb-2">
                        Product <span className="text-rudark-volt">Master</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm">
                        Manage synced inventory, pricing, and content.
                    </p>
                </div>
                <div className="flex gap-4">
                    <SyncButton />
                    <Link href="/admin/products/new" className="flex items-center gap-2 bg-rudark-volt text-black px-6 py-2 rounded-sm font-condensed uppercase font-bold tracking-wide hover:bg-white transition-colors">
                        <Plus size={18} />
                        New Draft
                    </Link>
                </div>
            </div>

            {/* Filters (Visual Only for now) */}
            <div className="flex gap-4 items-center bg-rudark-carbon p-4 rounded-sm border border-rudark-grey">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="SEARCH SKU OR PRODUCT NAME..."
                        className="w-full bg-rudark-matte text-white pl-10 pr-4 py-2 text-sm border border-rudark-grey focus:border-rudark-volt focus:outline-none placeholder-gray-600 font-mono uppercase"
                    />
                </div>
                <select className="bg-rudark-matte text-white px-4 py-2 text-sm border border-rudark-grey focus:border-rudark-volt focus:outline-none font-mono uppercase">
                    <option>All Categories</option>
                    <option>Apparel</option>
                    <option>Watercraft</option>
                    <option>Gear</option>
                </select>
                <select className="bg-rudark-matte text-white px-4 py-2 text-sm border border-rudark-grey focus:border-rudark-volt focus:outline-none font-mono uppercase">
                    <option>All Status</option>
                    <option>In Stock</option>
                    <option>Low Stock</option>
                    <option>Archived</option>
                </select>
            </div>

            {/* Data Table */}
            <div className="rounded-sm border border-rudark-grey overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-rudark-carbon text-gray-400 font-condensed uppercase tracking-wider text-sm">
                        <tr>
                            <th className="p-4 font-bold border-b border-rudark-grey w-24">Image</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Product Info</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Category</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Prices</th>
                            <th className="p-4 font-bold border-b border-rudark-grey">Stock</th>
                            <th className="p-4 font-bold border-b border-rudark-grey text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-rudark-matte divide-y divide-rudark-grey/30">
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-rudark-carbon/50 transition-colors group">
                                <td className="p-4">
                                    <div className="w-16 h-16 bg-white/5 rounded-sm border border-rudark-grey/50 overflow-hidden relative">
                                        {product.images && product.images[0] ? (
                                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs font-mono">NO IMG</div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-white uppercase font-condensed text-lg">{product.name}</div>
                                    <div className="text-rudark-volt font-mono text-xs">{product.sku}</div>
                                </td>
                                <td className="p-4">
                                    <span className="inline-block px-2 py-1 bg-rudark-grey/30 text-gray-300 text-xs font-mono uppercase rounded-sm border border-rudark-grey/50">
                                        {product.category_slug || 'Uncategorized'}
                                    </span>
                                </td>
                                <td className="p-4 font-mono text-sm">
                                    {product.promo_price ? (
                                        <div className="flex flex-col">
                                            <span className="text-rudark-volt font-bold">RM {product.promo_price.toFixed(2)}</span>
                                            <span className="text-gray-500 line-through text-xs">RM {product.web_price?.toFixed(2)}</span>
                                        </div>
                                    ) : (
                                        <span className="text-white">RM {product.web_price?.toFixed(2)}</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-bold font-condensed uppercase tracking-wide border ${product.stock_status === 'IN_STOCK' ? 'bg-green-900/20 text-green-400 border-green-900/50' :
                                        product.stock_status === 'LOW' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50' :
                                            'bg-red-900/20 text-red-400 border-red-900/50'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${product.stock_status === 'IN_STOCK' ? 'bg-green-400' :
                                            product.stock_status === 'LOW' ? 'bg-yellow-400' :
                                                'bg-red-400'
                                            }`} />
                                        {product.stock_status?.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/admin/products/${product.id}`}
                                            className="p-2 text-gray-400 hover:text-rudark-volt hover:bg-white/5 rounded-sm transition-colors"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                        <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-900/10 rounded-sm transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {products.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-500 font-mono uppercase">
                                    No products found. Start by syncing with Loyverse.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
