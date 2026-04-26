'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, LayoutDashboard, ShoppingCart, Package, Warehouse, BarChart3,
    Settings, Tag, FolderTree, Users, ScanLine, X, ArrowRight, Hash
} from 'lucide-react';
import { getOrders } from '@/actions/order-admin-actions';
import { getProducts } from '@/actions/product-actions';

const QUICK_NAV = [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={15} /> },
    { label: 'Orders', href: '/admin/orders', icon: <ShoppingCart size={15} /> },
    { label: 'Ship Scan', href: '/admin/orders/ship-scan', icon: <ScanLine size={15} /> },
    { label: 'Stock', href: '/admin/stock', icon: <Warehouse size={15} /> },
    { label: 'Products', href: '/admin/products', icon: <Package size={15} /> },
    { label: 'Promos', href: '/admin/promos', icon: <Tag size={15} /> },
    { label: 'Categories', href: '/admin/categories', icon: <FolderTree size={15} /> },
    { label: 'Customers', href: '/admin/customers', icon: <Users size={15} /> },
    { label: 'Reports', href: '/admin/reports', icon: <BarChart3 size={15} /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings size={15} /> },
];

type Result = {
    type: 'nav' | 'order' | 'product';
    label: string;
    sublabel?: string;
    href: string;
};

export default function CommandPalette() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Result[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Global Ctrl+K listener
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (open) {
            setQuery('');
            setResults([]);
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const search = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        const lower = q.toLowerCase();

        // Filter quick nav
        const navResults: Result[] = QUICK_NAV
            .filter(n => n.label.toLowerCase().includes(lower))
            .map(n => ({ type: 'nav' as const, label: n.label, href: n.href }));

        setResults(navResults);

        // Search orders and products in parallel
        const [ordersPage, products] = await Promise.all([
            getOrders({ search: q, pageSize: 5 }).catch(() => ({ orders: [], nextCursor: null, searchMode: false })),
            getProducts().catch(() => []),
        ]);

        const orderResults: Result[] = ordersPage.orders.slice(0, 5).map(o => ({
            type: 'order' as const,
            label: o.id,
            sublabel: `${o.customer_name} · RM ${o.total_amount.toFixed(2)} · ${o.status}`,
            href: `/admin/orders/${o.id}`,
        }));

        const productResults: Result[] = (products as any[])
            .filter((p: any) =>
                p.name?.toLowerCase().includes(lower) ||
                p.sku?.toLowerCase().includes(lower)
            )
            .slice(0, 5)
            .map((p: any) => ({
                type: 'product' as const,
                label: p.name,
                sublabel: `SKU: ${p.sku} · RM ${p.web_price?.toFixed(2) ?? '–'}`,
                href: `/admin/products/${p.sku}`,
            }));

        setResults([...navResults, ...orderResults, ...productResults]);
        setActiveIdx(0);
        setLoading(false);
    }, []);

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => search(query), 250);
        return () => clearTimeout(searchTimeout.current);
    }, [query, search]);

    const visibleItems = query.trim() ? results : QUICK_NAV.map(n => ({ type: 'nav' as const, label: n.label, sublabel: undefined, href: n.href }));

    const navigate = (href: string) => {
        setOpen(false);
        router.push(href);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, visibleItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && visibleItems[activeIdx]) {
            navigate(visibleItems[activeIdx].href);
        }
    };

    const typeIcon = (type: Result['type']) => {
        if (type === 'order') return <Hash size={13} className="text-blue-500" />;
        if (type === 'product') return <Package size={13} className="text-emerald-500" />;
        const nav = QUICK_NAV.find(n => n.href === visibleItems[0]?.href);
        return nav?.icon ?? <ArrowRight size={13} className="text-gray-400" />;
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 z-[200] flex items-start justify-center pt-[15vh]"
            onClick={() => setOpen(false)}
        >
            <div
                className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Search size={16} className="text-gray-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search orders, products, pages…"
                        className="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
                    />
                    {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                    <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={15} />
                    </button>
                </div>

                {/* Results */}
                <ul className="max-h-80 overflow-y-auto py-1">
                    {visibleItems.length === 0 && !loading && (
                        <li className="px-4 py-8 text-center text-sm text-gray-400">No results</li>
                    )}
                    {visibleItems.map((item, idx) => (
                        <li key={item.href + idx}>
                            <button
                                onClick={() => navigate(item.href)}
                                onMouseEnter={() => setActiveIdx(idx)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                    idx === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
                                }`}
                            >
                                <span className="shrink-0 text-gray-400">
                                    {item.type === 'order'
                                        ? <Hash size={13} className="text-blue-500" />
                                        : item.type === 'product'
                                            ? <Package size={13} className="text-emerald-500" />
                                            : (QUICK_NAV.find(n => n.href === item.href)?.icon ?? <ArrowRight size={13} />)
                                    }
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-800 truncate block">{item.label}</span>
                                    {item.sublabel && (
                                        <span className="text-xs text-gray-400 truncate block">{item.sublabel}</span>
                                    )}
                                </span>
                                <ArrowRight size={13} className={`shrink-0 transition-opacity ${idx === activeIdx ? 'opacity-100 text-blue-500' : 'opacity-0'}`} />
                            </button>
                        </li>
                    ))}
                </ul>

                {/* Footer */}
                <div className="flex items-center gap-3 px-4 py-2 border-t border-gray-100 text-[11px] text-gray-400">
                    <span><kbd className="font-mono bg-gray-100 px-1 rounded">↑↓</kbd> navigate</span>
                    <span><kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> open</span>
                    <span><kbd className="font-mono bg-gray-100 px-1 rounded">Esc</kbd> close</span>
                    <span className="ml-auto"><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl K</kbd> toggle</span>
                </div>
            </div>
        </div>
    );
}
