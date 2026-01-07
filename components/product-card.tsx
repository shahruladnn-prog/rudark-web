'use client';

import { Product } from '@/types';
import { useCart } from '@/context/cart-context';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductCard({ product }: { product: Product }) {
    const { addToCart } = useCart();

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addToCart(product);
    };

    const hasPromo = product.promo_price && product.promo_price > 0 && product.promo_price < product.web_price;
    const displayPrice = hasPromo ? product.promo_price : product.web_price;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative bg-rudark-carbon border border-rudark-grey/50 rounded-sm overflow-hidden hover:border-rudark-volt transition-all duration-300 flex flex-col h-full"
        >
            {/* Badge */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {product.stock_status === 'OUT' && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                        Sold Out
                    </span>
                )}
                {product.stock_status === 'LOW' && (
                    <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                        Low Stock
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
                    <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-mono text-xs">
                        NO IMAGE
                    </div>
                )}

                {/* Quick Add Overlay */}
                {product.stock_status !== 'OUT' && (
                    <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <button
                            onClick={handleAddToCart}
                            className="w-full bg-rudark-volt text-black font-condensed font-bold uppercase py-3 hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                        >
                            <ShoppingCart size={16} />
                            Add To Cart
                        </button>
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

                <div className="mt-auto flex items-center gap-3">
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
            </div>
        </motion.div>
    );
}
