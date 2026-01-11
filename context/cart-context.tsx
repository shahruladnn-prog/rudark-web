'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Product } from '@/types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number, selected_options?: Record<string, string>) => void;
    removeFromCart: (sku: string, selected_options?: Record<string, string>) => void;
    updateQuantity: (sku: string, quantity: number, selected_options?: Record<string, string>) => void;
    clearCart: () => void;
    subtotal: number;
    totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [mounted, setMounted] = useState(false);

    // Load from local storage
    useEffect(() => {
        const savedCart = localStorage.getItem('rudark_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error('Failed to parse cart', e);
            }
        }
        setMounted(true);
    }, []);

    // Save to local storage
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('rudark_cart', JSON.stringify(cart));
        }
    }, [cart, mounted]);

    const addToCart = (product: Product, quantity = 1, selected_options?: Record<string, string>) => {
        setCart((prev) => {
            // Find item with same SKU AND same options
            const existingIndex = prev.findIndex((item) => {
                const sameSku = item.sku === product.sku;
                const sameOptions = JSON.stringify(item.selected_options || {}) === JSON.stringify(selected_options || {});
                return sameSku && sameOptions;
            });

            if (existingIndex > -1) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += quantity;
                return newCart;
            }
            return [...prev, { ...product, quantity, selected_options }];
        });
    };

    const removeFromCart = (sku: string, selected_options?: Record<string, string>) => {
        setCart((prev) => prev.filter((item) => {
            const sameSku = item.sku === sku;
            const sameOptions = JSON.stringify(item.selected_options || {}) === JSON.stringify(selected_options || {});
            // Keep if NOT same (so remove if SAME)
            return !(sameSku && sameOptions);
        }));
    };

    const updateQuantity = (sku: string, quantity: number, selected_options?: Record<string, string>) => {
        if (quantity <= 0) {
            removeFromCart(sku, selected_options);
            return;
        }
        setCart((prev) =>
            prev.map((item) => {
                const sameSku = item.sku === sku;
                const sameOptions = JSON.stringify(item.selected_options || {}) === JSON.stringify(selected_options || {});
                return (sameSku && sameOptions) ? { ...item, quantity } : item;
            })
        );
    };

    const clearCart = () => setCart([]);

    const subtotal = cart.reduce((sum, item) => sum + item.web_price * item.quantity, 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (!mounted) {
        return null; // or loading spinner
    }

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                subtotal,
                totalItems,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
