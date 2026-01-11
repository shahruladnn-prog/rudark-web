'use client';

import { Product } from '@/types';
import { useCart } from '@/context/cart-context';
import { useState } from 'react';
import { Loader2, ShoppingBag } from 'lucide-react';
import { checkLoyverseStock } from '@/actions/check-loyverse-stock';
import { useDialog } from '@/components/ui/dialog';

export default function AddToCartButton({ product, selectedOptions }: { product: Product, selectedOptions?: Record<string, string> }) {
    const { addToCart, cart } = useCart();
    const dialog = useDialog();
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    const handleInitialClick = () => {
        setShowModal(true);
    };

    const confirmAddToCart = async () => {
        setShowModal(false);
        setLoading(true);

        try {
            // 1. Calculate existing quantity in cart for THIS SKU
            const existingInCart = cart
                .filter((item: any) => item.sku === product.sku)
                .reduce((sum: number, item: any) => sum + item.quantity, 0);

            // 2. Check TOTAL (existing + new) against Loyverse stock
            const totalRequested = existingInCart + quantity;
            const stockCheck = await checkLoyverseStock(product.sku, totalRequested);

            if (!stockCheck.available) {
                setLoading(false);

                await dialog.alert({
                    title: 'Insufficient Stock',
                    message: existingInCart > 0
                        ? `You already have ${existingInCart} in your cart.\nOnly ${stockCheck.currentStock} units available total.`
                        : `Only ${stockCheck.currentStock} units available.`
                });
                return;
            }

            // 3. Stock available - add to cart
            addToCart(product, quantity, selectedOptions);

            // 4. Show success
            await dialog.success(`${quantity} × ${product.name} added to cart!`);
            setQuantity(1);

        } catch (error) {
            console.error('Add to cart error:', error);
            await dialog.alert({
                title: 'Error',
                message: 'Failed to add item to cart.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleInitialClick}
                disabled={loading}
                className={`w-full md:w-auto px-8 py-4 font-condensed font-bold text-xl uppercase tracking-wider transition-all transform active:scale-95 flex items-center justify-center gap-2 bg-rudark-volt text-black hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" size={24} />
                        Adding...
                    </>
                ) : (
                    <>
                        <ShoppingBag size={24} />
                        Add to Cart
                    </>
                )}
            </button>

            {/* Quantity Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-8 max-w-md w-full">
                        <h3 className="text-2xl font-condensed font-bold mb-4 uppercase text-white">
                            Select Quantity
                        </h3>
                        <p className="text-gray-400 mb-6">
                            {product.name} {selectedOptions && Object.keys(selectedOptions).length > 0 && (
                                <span className="text-rudark-volt">
                                    ({Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')})
                                </span>
                            )}
                        </p>

                        <div className="flex items-center justify-center gap-4 mb-8">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 border border-gray-600 text-white flex items-center justify-center hover:bg-white/10"
                            >
                                -
                            </button>
                            <span className="text-2xl font-mono font-bold text-rudark-volt w-12 text-center">
                                {quantity}
                            </span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 border border-gray-600 text-white flex items-center justify-center hover:bg-white/10"
                            >
                                +
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowModal(false)}
                                className="py-3 border border-gray-600 text-gray-400 font-bold uppercase text-sm hover:bg-white/5 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAddToCart}
                                className="py-3 bg-rudark-volt text-black font-bold uppercase text-sm hover:bg-white transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
