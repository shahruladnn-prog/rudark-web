'use client';

import Link from 'next/link';
import { Product } from '@/types';
import { Clock } from 'lucide-react';

export default function PreorderClient({ products }: { products: Product[] }) {
    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20 px-4 md:px-8 bg-[url('/grid-mesh.svg')] bg-fixed">
            <div className="max-w-6xl mx-auto">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-condensed font-bold uppercase tracking-wide mb-4">
                        Pre-Order
                    </h1>
                    <p className="text-gray-400 max-w-xl mx-auto">
                        Reserve your gear ahead of arrival. Pay a small deposit now, settle the balance when it lands.
                    </p>
                </div>

                {products.length === 0 ? (
                    <p className="text-center text-gray-500 font-mono uppercase tracking-widest">
                        No pre-order items available right now.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(product => (
                            <Link
                                key={product.id || product.sku}
                                href={`/preorder/${product.sku}`}
                                className="group bg-rudark-carbon border border-rudark-grey/50 rounded-sm overflow-hidden hover:border-rudark-volt transition-colors"
                            >
                                <div className="relative aspect-[3/4] bg-black/40 overflow-hidden">
                                    {product.images?.[0] ? (
                                        <img
                                            src={product.images[0]}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-condensed tracking-wider">
                                            NO IMAGE
                                        </div>
                                    )}
                                    {product.pre_order_eta && (
                                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 text-rudark-volt text-xs font-mono uppercase px-2.5 py-1 rounded">
                                            <Clock size={12} />
                                            {product.pre_order_eta}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <h2 className="font-condensed font-bold text-xl uppercase mb-1 group-hover:text-rudark-volt transition-colors">
                                        {product.name}
                                    </h2>
                                    <p className="text-gray-400 text-sm mb-3">
                                        RM {(product.promo_price || product.web_price).toFixed(2)}
                                    </p>
                                    <span className="inline-block text-xs font-mono uppercase tracking-widest text-rudark-volt border border-rudark-volt/40 px-3 py-1.5 rounded-sm">
                                        {product.pre_order_deposit_percent || 100}% deposit to reserve
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
