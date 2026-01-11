'use client';

import { useEffect, useState } from 'react';
import { getProductsBySlug } from '@/actions/shop-actions';
import { Product } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import AddToCartButton from '@/components/add-to-cart-button'; // Refactor this to be cleaner if needed

export default function ShopCategoryPage({ params }: { params: { slug: string[] } }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');

    useEffect(() => {
        const load = async () => {
            // ... (keep comments)
            const { slug } = await params; // Await just in case
            const data = await getProductsBySlug(slug);
            setProducts(data.products);
            const subcatName = 'subcategoryName' in data ? data.subcategoryName : null;
            setTitle(subcatName ? `${data.categoryName} / ${subcatName}` : data.categoryName || 'Shop');
            setLoading(false);
        };
        load();
    }, [params]);

    if (loading) {
        return (
            <div className="min-h-screen bg-rudark-matte flex items-center justify-center text-white font-condensed tracking-widest uppercase animate-pulse">
                Acquiring Signal...
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-8 text-center bg-[url('/grid-mesh.png')] bg-fixed">
                <h1 className="text-4xl font-condensed font-bold uppercase mb-4">{title}</h1>
                <p className="text-gray-400 font-mono mb-8">No tactical gear found in this sector.</p>
                <Link href="/" className="text-rudark-volt hover:underline uppercase text-sm tracking-widest font-bold">Return to Base</Link>

                {/* DIAGNOSTICS */}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.png')] bg-fixed">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-5xl md:text-7xl font-condensed font-bold uppercase mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tighter">
                    {title}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <Link href={`/product/${product.sku || product.id}`} key={product.id} className="group block bg-rudark-carbon border border-rudark-grey/30 hover:border-rudark-volt transition-all duration-300">
                            <div className="aspect-[4/5] relative overflow-hidden bg-black/50">
                                {product.images && product.images[0] ? (
                                    <Image
                                        src={product.images[0]}
                                        alt={product.name}
                                        fill
                                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-xs uppercase tracking-widest">
                                        No Visual
                                    </div>
                                )}

                                {product.stock_status !== 'IN_STOCK' && (
                                    <div className={`absolute top-2 left-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${product.stock_status === 'OUT' ? 'bg-red-600' : 'bg-orange-500'} text-black`}>
                                        {product.stock_status === 'OUT' ? 'Sold Out' : 'Low Stock'}
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="font-condensed font-bold text-xl uppercase mb-1 truncate text-white group-hover:text-rudark-volt transition-colors">
                                    {product.name}
                                </h3>
                                <p className="text-rudark-volt font-mono font-bold">
                                    RM {product.web_price.toFixed(2)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
