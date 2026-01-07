'use client';

import { Product } from '@/types';
import { useCart } from '@/context/cart-context';
import { useState } from 'react';
import { Loader2, ShoppingBag } from 'lucide-react';

export default function AddToCartButton({ product }: { product: Product }) {
    const { addToCart } = useCart();
    const [loading, setLoading] = useState(false);
    const isOutOfStock = product.stock_status === 'OUT';

    const handleAdd = () => {
        setLoading(true);
        setTimeout(() => {
            addToCart(product);
            setLoading(false);
        }, 500);
    };

    return (
        <button
            onClick={handleAdd}
            disabled={isOutOfStock || loading}
            className={`w-full md:w-auto px-8 py-4 font-condensed font-bold text-xl uppercase tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2 ${isOutOfStock
                    ? 'bg-rudark-grey text-gray-400 cursor-not-allowed border border-transparent'
                    : 'bg-rudark-volt text-black hover:bg-white border-2 border-transparent hover:shadow-[0_0_15px_rgba(212,242,34,0.3)]'
                }`}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} /> PROCESSING
                </span>
            ) : isOutOfStock ? (
                'Sold Out'
            ) : (
                <>
                    <ShoppingBag size={20} />
                    Add to Cart
                </>
            )}
        </button>
    );
}
