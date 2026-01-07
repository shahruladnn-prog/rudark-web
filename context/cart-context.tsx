'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, Product } from '@/types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (sku: string) => void;
    updateQuantity: (sku: string, quantity: number) => void;
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

    const addToCart = (product: Product, quantity = 1) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.sku === product.sku);
            if (existing) {
                return prev.map((item) =>
                    item.sku === product.sku
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity }];
        });
    };

    const removeFromCart = (sku: string) => {
        setCart((prev) => prev.filter((item) => item.sku !== sku));
    };

    const updateQuantity = (sku: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(sku);
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.sku === sku ? { ...item, quantity } : item
            )
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
