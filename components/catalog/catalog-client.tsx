'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Search, SlidersHorizontal, LayoutGrid, List, ClipboardList,
    ShoppingBag, Sparkles, Building2, PartyPopper, ArrowDown,
} from 'lucide-react';
import { CatalogItem } from '@/types';
import { Category } from '@/types';
import CatalogProductCard from './catalog-product-card';
import CatalogQuickView from './catalog-quick-view';
import CatalogInquiryDrawer from './catalog-inquiry-drawer';
import { useCatalogInquiry } from '@/context/catalog-inquiry-context';

export type CatalogUseFilter = 'all' | 'online' | 'events' | 'corporate';

interface CatalogClientProps {
    items: CatalogItem[];
    categories: Array<Pick<Category, 'name' | 'slug'> & { id?: string }>;
    initialUse?: CatalogUseFilter;
    heroTitle?: string;
    heroSubtitle?: string;
    hideUseCaseTiles?: boolean;
}

const USE_CASE_TILES: { id: CatalogUseFilter; label: string; sub: string; icon: typeof ShoppingBag; href?: string }[] = [
    { id: 'all', label: 'All Products', sub: 'Full range', icon: LayoutGrid },
    { id: 'online', label: 'Shop Online', sub: 'Buy now', icon: ShoppingBag },
    { id: 'events', label: 'Events & Merch', sub: 'Bulk & custom', icon: PartyPopper, href: '/catalog/events' },
    { id: 'corporate', label: 'Corporate & Gifts', sub: 'Team building', icon: Building2, href: '/catalog/corporate' },
];

export default function CatalogClient({
    items,
    categories,
    initialUse = 'all',
    heroTitle = "Everything we make & customize",
    heroSubtitle = "Retail gear, event merchandise, corporate gifts, and custom printing — browse our full capability list.",
    hideUseCaseTiles = false,
}: CatalogClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const gridRef = useRef<HTMLDivElement>(null);
    const { count, setIsOpen } = useCatalogInquiry();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [purchaseFilter, setPurchaseFilter] = useState<'all' | 'online' | 'inquire'>('all');
    const [useFilter, setUseFilter] = useState<CatalogUseFilter>(initialUse);
    const [sortBy, setSortBy] = useState('featured');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);
    const [quickViewItem, setQuickViewItem] = useState<CatalogItem | null>(null);

    useEffect(() => {
        const use = searchParams.get('use') as CatalogUseFilter | null;
        if (use && ['all', 'online', 'events', 'corporate'].includes(use)) {
            setUseFilter(use);
        }
        const q = searchParams.get('q');
        if (q) setSearchQuery(q);
    }, [searchParams]);

    const applyUseFilter = useCallback((use: CatalogUseFilter) => {
        setUseFilter(use);
        if (!hideUseCaseTiles) {
            const params = new URLSearchParams(searchParams.toString());
            if (use === 'all') params.delete('use');
            else params.set('use', use);
            router.replace(`/catalog${params.toString() ? `?${params}` : ''}`, { scroll: false });
        }
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [hideUseCaseTiles, router, searchParams]);

    const filteredItems = useMemo(() => {
        let list = [...items];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                i =>
                    i.name.toLowerCase().includes(q) ||
                    i.sku.toLowerCase().includes(q) ||
                    i.description?.toLowerCase().includes(q) ||
                    i.catalog_tags?.some(t => t.toLowerCase().includes(q))
            );
        }

        if (selectedCategories.length) {
            list = list.filter(i => i.category_slug && selectedCategories.includes(i.category_slug));
        }

        if (purchaseFilter === 'online') {
            list = list.filter(i => i.purchase_mode === 'online');
        } else if (purchaseFilter === 'inquire') {
            list = list.filter(i => i.purchase_mode === 'inquire' || i.purchase_mode === 'display');
        }

        if (useFilter === 'online') {
            list = list.filter(i => i.purchase_mode === 'online');
        } else if (useFilter === 'events') {
            list = list.filter(
                i =>
                    i.use_cases?.includes('events') ||
                    i.catalog_tags?.some(t => ['event-merch', 'custom-print', 'bulk', 'embroidery'].includes(t))
            );
        } else if (useFilter === 'corporate') {
            list = list.filter(
                i =>
                    i.use_cases?.includes('corporate') ||
                    i.catalog_tags?.some(t => ['door-gift', 'corporate', 'printing'].includes(t))
            );
        }

        list.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'newest':
                    return (b.catalog_sort ?? 9999) - (a.catalog_sort ?? 9999);
                case 'featured':
                default:
                    if (a.catalog_featured && !b.catalog_featured) return -1;
                    if (!a.catalog_featured && b.catalog_featured) return 1;
                    return (a.catalog_sort ?? 9999) - (b.catalog_sort ?? 9999);
            }
        });

        return list;
    }, [items, searchQuery, selectedCategories, purchaseFilter, useFilter, sortBy]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        items.forEach(i => {
            if (i.category_slug) counts[i.category_slug] = (counts[i.category_slug] || 0) + 1;
        });
        return counts;
    }, [items]);

    const toggleCategory = (slug: string) => {
        setSelectedCategories(prev =>
            prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategories([]);
        setPurchaseFilter('all');
        setUseFilter(initialUse);
        setSortBy('featured');
    };

    return (
        <div className="min-h-screen bg-rudark-matte pt-32">
            {/* Hero */}
            <section className="relative border-b border-rudark-grey bg-rudark-carbon overflow-hidden">
                <motion.div className="absolute inset-0 bg-[url('/grid-mesh.svg')] opacity-30" />
                <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20">
                    <span className="text-rudark-volt font-mono text-xs tracking-widest uppercase flex items-center gap-2">
                        <Sparkles size={14} /> Product Catalog
                    </span>
                    <h1 className="text-4xl md:text-6xl font-condensed font-bold text-white uppercase mt-2 max-w-3xl leading-none">
                        {heroTitle}
                    </h1>
                    <p className="text-gray-400 mt-4 max-w-2xl text-lg">{heroSubtitle}</p>
                    <div className="flex flex-wrap gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="inline-flex items-center gap-2 bg-rudark-volt text-black font-bold px-6 py-3 rounded-sm uppercase text-sm tracking-wider hover:bg-white transition-colors"
                        >
                            Browse catalog <ArrowDown size={16} />
                        </button>
                        <Link
                            href="/contact?subject=wholesale"
                            className="inline-flex items-center gap-2 border border-rudark-grey text-white font-bold px-6 py-3 rounded-sm uppercase text-sm tracking-wider hover:border-rudark-volt hover:text-rudark-volt transition-colors"
                        >
                            Partner with us
                        </Link>
                    </div>
                    <p className="text-xs font-mono text-gray-600 mt-6">
                        Browse → Add to inquiry list → WhatsApp, email, or share with your team
                    </p>
                </div>
            </section>

            {/* Use-case tiles */}
            {!hideUseCaseTiles && (
                <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {USE_CASE_TILES.map(tile => {
                            const Icon = tile.icon;
                            const active = useFilter === tile.id;
                            const inner = (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (tile.href && tile.id !== 'all' && tile.id !== 'online') {
                                            router.push(tile.href);
                                        } else {
                                            applyUseFilter(tile.id);
                                        }
                                    }}
                                    className={`w-full text-left p-4 md:p-5 rounded-sm border-2 transition-all ${active ? 'border-rudark-volt bg-rudark-volt/10' : 'border-rudark-grey bg-rudark-carbon hover:border-rudark-volt/50'}`}
                                >
                                    <Icon size={22} className={active ? 'text-rudark-volt' : 'text-gray-500'} />
                                    <h3 className="font-condensed font-bold text-white uppercase mt-3 text-lg">{tile.label}</h3>
                                    <p className="text-xs text-gray-500 font-mono mt-1">{tile.sub}</p>
                                </button>
                            );
                            return <div key={tile.id}>{inner}</div>;
                        })}
                    </div>
                </section>
            )}

            {/* Sticky controls */}
            <div className="sticky top-20 md:top-24 z-40 bg-rudark-matte/95 backdrop-blur-md border-b border-rudark-grey/50">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="search"
                                placeholder="Search name, SKU, tags…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-rudark-carbon border border-rudark-grey pl-10 pr-4 py-2.5 text-sm text-white rounded-sm focus:border-rudark-volt focus:outline-none"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="bg-rudark-carbon border border-rudark-grey text-white text-sm px-3 py-2.5 rounded-sm focus:border-rudark-volt focus:outline-none"
                        >
                            <option value="featured">Featured</option>
                            <option value="name">Name A–Z</option>
                            <option value="newest">Sort order</option>
                        </select>
                        <div className="hidden sm:flex border border-rudark-grey rounded-sm overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 ${viewMode === 'grid' ? 'bg-rudark-volt text-black' : 'text-gray-400 hover:text-white'}`}
                                aria-label="Grid view"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 ${viewMode === 'list' ? 'bg-rudark-volt text-black' : 'text-gray-400 hover:text-white'}`}
                                aria-label="List view"
                            >
                                <List size={18} />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className="md:hidden flex items-center gap-2 px-3 py-2.5 border border-rudark-grey rounded-sm text-sm text-white"
                        >
                            <SlidersHorizontal size={16} /> Filters
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rudark-carbon border border-rudark-volt text-rudark-volt font-bold text-sm uppercase rounded-sm hover:bg-rudark-volt hover:text-black transition-colors"
                        >
                            <ClipboardList size={18} />
                            Inquiry {count > 0 ? `(${count})` : ''}
                        </button>
                    </div>

                    <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] font-mono text-gray-500 uppercase w-full md:w-auto">Purchase:</span>
                            {(['all', 'online', 'inquire'] as const).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPurchaseFilter(p)}
                                    className={`text-xs font-bold uppercase px-3 py-1 rounded-sm border ${purchaseFilter === p ? 'border-rudark-volt text-rudark-volt bg-rudark-volt/10' : 'border-rudark-grey text-gray-400'}`}
                                >
                                    {p === 'all' ? 'All' : p === 'online' ? 'Buy online' : 'Inquire'}
                                </button>
                            ))}
                        </div>
                        {categories.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto">
                                {categories.map(cat => (
                                    <button
                                        key={cat.slug}
                                        type="button"
                                        onClick={() => toggleCategory(cat.slug)}
                                        className={`text-xs font-mono uppercase px-2 py-1 rounded-sm border ${selectedCategories.includes(cat.slug) ? 'border-rudark-volt text-rudark-volt' : 'border-rudark-grey/50 text-gray-500'}`}
                                    >
                                        {cat.name} ({categoryCounts[cat.slug] || 0})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <section ref={gridRef} className="max-w-7xl mx-auto px-4 md:px-8 py-10 pb-28">
                <div className="flex justify-between items-center mb-6">
                    <p className="font-mono text-sm text-gray-500">
                        <span className="text-white font-bold">{filteredItems.length}</span> items
                    </p>
                    {(searchQuery || selectedCategories.length || purchaseFilter !== 'all' || useFilter !== initialUse) && (
                        <button type="button" onClick={clearFilters} className="text-xs font-mono text-rudark-volt uppercase hover:text-white">
                            Clear filters
                        </button>
                    )}
                </div>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-rudark-grey rounded-sm">
                        <p className="font-condensed text-2xl text-white uppercase mb-2">No items match</p>
                        <p className="text-gray-500 text-sm mb-6">Try clearing filters or contact us for custom requests.</p>
                        <Link href="/contact" className="text-rudark-volt font-bold uppercase text-sm hover:text-white">
                            Contact us →
                        </Link>
                    </div>
                ) : (
                    <div
                        className={
                            viewMode === 'grid'
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                                : 'flex flex-col gap-3'
                        }
                    >
                        {filteredItems.map(item => (
                            <CatalogProductCard
                                key={`${item.source}-${item.sku}`}
                                item={item}
                                viewMode={viewMode}
                                onQuickView={setQuickViewItem}
                            />
                        ))}
                    </div>
                )}

                <div className="mt-16 p-8 bg-rudark-carbon border border-rudark-grey rounded-sm text-center">
                    <h3 className="font-condensed text-2xl text-white uppercase mb-2">Need something custom?</h3>
                    <p className="text-gray-400 text-sm mb-4 max-w-lg mx-auto">
                        Event merch, corporate door gifts, screen printing, and team-building add-ons — we collaborate with agencies and venues across Malaysia.
                    </p>
                    <Link href="/contact?subject=wholesale" className="inline-block bg-rudark-volt text-black font-bold px-8 py-3 uppercase text-sm tracking-wider rounded-sm hover:bg-white">
                        Get in touch
                    </Link>
                </div>
            </section>

            {/* Mobile bottom bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-rudark-grey bg-rudark-matte/95 backdrop-blur">
                <button
                    type="button"
                    onClick={() => setShowFilters(true)}
                    className="flex-1 py-4 text-center text-sm font-bold uppercase text-white flex items-center justify-center gap-2"
                >
                    <SlidersHorizontal size={18} /> Filters
                </button>
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="flex-1 py-4 text-center text-sm font-bold uppercase bg-rudark-volt text-black flex items-center justify-center gap-2"
                >
                    <ClipboardList size={18} /> Inquiry ({count})
                </button>
            </div>

            <CatalogQuickView item={quickViewItem} onClose={() => setQuickViewItem(null)} />
            <CatalogInquiryDrawer />
        </div>
    );
}
