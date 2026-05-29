'use client';

import { Product } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function ProductCard({ product }: { product: Product }) {
    const hasPromo = product.promo_price && product.promo_price > 0 && product.promo_price < product.web_price;
    const displayPrice = hasPromo ? product.promo_price : product.web_price;

    const availableStock = Math.max(0, (product.stock_quantity ?? 0) - (product.reserved_quantity ?? 0));
    const showCount = product.stock_status === 'LOW' && availableStock > 0 && availableStock <= 10;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative bg-rudark-carbon border border-rudark-grey/50 rounded-sm overflow-hidden hover:border-rudark-volt transition-all duration-300 flex flex-col h-full"
        >
            {/* Badges */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {product.stock_status === 'OUT' && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                        Sold Out
                    </span>
                )}
                {product.stock_status === 'LOW' && (
                    <span className="bg-orange-500 text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                        {showCount ? `${availableStock} Left` : 'Low Stock'}
                    </span>
                )}
                {product.stock_status === 'CONTACT_US' && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                        Contact Us
                    </span>
                )}
                {hasPromo && (
                    <span className="bg-rudark-volt text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                        Sale
                    </span>
                )}
            </div>

            <Link href={`/product/${product.sku}`} className="block relative aspect-[4/5] bg-white/5 overflow-hidden">
                {product.images?.[0] ? (
                    <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-xs">
                        NO IMAGE
                    </div>
                )}
            </Link>

            <div className="p-4 flex flex-col flex-1">
                <Link href={`/product/${product.sku}`} className="block">
                    <h3 className="text-xl font-condensed font-bold text-white uppercase leading-tight mb-1 group-hover:text-rudark-volt transition-colors line-clamp-2">
                        {product.name}
                    </h3>
                </Link>
                <p className="text-gray-500 text-xs font-mono mb-4 line-clamp-1">
                    {product.category_slug?.replace(/-/g, ' ')}
                </p>

                <div className="mt-auto">
                    <div className="flex items-center gap-3 mb-2">
                        {hasPromo ? (
                            <>
                                <span className="text-lg font-mono font-bold text-rudark-volt">
                                    RM {displayPrice?.toFixed(2)}
                                </span>
                                <span className="text-sm font-mono text-gray-500 line-through decoration-gray-500">
                                    RM {product.web_price?.toFixed(2)}
                                </span>
                            </>
                        ) : (
                            <span className="text-lg font-mono font-bold text-white">
                                RM {product.web_price?.toFixed(2)}
                            </span>
                        )}
                    </div>
                    {product.review_count && product.review_count > 0 ? (
                        <div className="flex items-center gap-1">
                            <span className="text-rudark-volt text-xs">{'★'.repeat(Math.round(product.average_rating || 0))}{'☆'.repeat(5 - Math.round(product.average_rating || 0))}</span>
                            <span className="font-mono text-[10px] text-gray-500">({product.review_count})</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </motion.div>
    );
}
