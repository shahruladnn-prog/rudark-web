'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CatalogInquiryLine, CatalogItemSource } from '@/types';

const STORAGE_KEY = 'rudark-catalog-inquiry';

interface AddItemInput {
    sku: string;
    name: string;
    image?: string;
    source: CatalogItemSource;
}

interface CatalogInquiryContextValue {
    items: CatalogInquiryLine[];
    count: number;
    addItem: (item: AddItemInput) => void;
    removeItem: (sku: string) => void;
    updateNote: (sku: string, note: string) => void;
    clearAll: () => void;
    hasItem: (sku: string) => boolean;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const CatalogInquiryContext = createContext<CatalogInquiryContextValue | null>(null);

export function CatalogInquiryProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CatalogInquiryLine[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setItems(JSON.parse(raw));
        } catch {
            /* ignore */
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }, [items, hydrated]);

    const addItem = useCallback((item: AddItemInput) => {
        setItems(prev => {
            if (prev.some(i => i.sku === item.sku)) return prev;
            return [...prev, { ...item }];
        });
        setIsOpen(true);
    }, []);

    const removeItem = useCallback((sku: string) => {
        setItems(prev => prev.filter(i => i.sku !== sku));
    }, []);

    const updateNote = useCallback((sku: string, note: string) => {
        setItems(prev => prev.map(i => (i.sku === sku ? { ...i, note } : i)));
    }, []);

    const clearAll = useCallback(() => setItems([]), []);

    const hasItem = useCallback((sku: string) => items.some(i => i.sku === sku), [items]);

    const value = useMemo(
        () => ({
            items,
            count: items.length,
            addItem,
            removeItem,
            updateNote,
            clearAll,
            hasItem,
            isOpen,
            setIsOpen,
        }),
        [items, addItem, removeItem, updateNote, clearAll, hasItem, isOpen]
    );

    return (
        <CatalogInquiryContext.Provider value={value}>
            {children}
        </CatalogInquiryContext.Provider>
    );
}

export function useCatalogInquiry() {
    const ctx = useContext(CatalogInquiryContext);
    if (!ctx) throw new Error('useCatalogInquiry must be used within CatalogInquiryProvider');
    return ctx;
}
