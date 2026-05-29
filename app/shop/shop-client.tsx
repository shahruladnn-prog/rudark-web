'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X, ChevronDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Product } from '@/types';
import ProductCard from '@/components/product-card';
import NewsletterForm from '@/components/newsletter-form';

interface Category {
    name: string;
    slug: string;
    product_count?: number;
    subcategories?: { name: string; slug: string }[];
}

interface ShopClientProps {
    initialProducts: Product[];
    allCategories: Category[];
    activeCategory?: string;
    activeSubcategory?: string;
    categoryName?: string;
    subcategoryName?: string;
}

function ShopClientInner({
    initialProducts,
    allCategories,
    activeCategory,
    activeSubcategory,
    categoryName,
    subcategoryName,
}: ShopClientProps) {
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [priceMax, setPriceMax] = useState(10000);
    const [sortBy, setSortBy] = useState('featured');
    const [showFilters, setShowFilters] = useState(false);

    // Subcategories for the active category (for tiles + sidebar expansion)
    const activeCategoryData = allCategories.find(c => c.slug === activeCategory);
    const currentSubcategories = activeCategoryData?.subcategories || [];

    // Client-side filter: search + price + sort
    // Category filtering is handled server-side via URL routing
    const filteredProducts = useMemo(() => {
        let result = [...initialProducts];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku?.toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        }

        if (priceMax < 10000) {
            result = result.filter(p => p.web_price <= priceMax);
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case 'price-asc': return a.web_price - b.web_price;
                case 'price-desc': return b.web_price - a.web_price;
                case 'name': return a.name.localeCompare(b.name);
                case 'newest': return (b.created_at || 0) > (a.created_at || 0) ? 1 : -1;
                default: return 0;
            }
        });

        return result;
    }, [initialProducts, searchQuery, priceMax, sortBy]);

    const hasFilters = searchQuery.trim().length > 0 || priceMax < 10000;

    const clearFilters = () => {
        setSearchQuery('');
        setPriceMax(10000);
        setSortBy('featured');
    };

    const pageTitle = subcategoryName
        ? `${categoryName} / ${subcategoryName}`
        : categoryName || 'Shop All Gear';

    // Category nav — shared between desktop sidebar and mobile drawer
    const categoryNav = (
        <div className="space-y-0.5">
            <p className="text-[10px] font-mono text-rudark-volt uppercase tracking-widest mb-3 px-3">Categories</p>
            <Link
                href="/shop"
                className={`flex items-center justify-between py-2 px-3 text-sm font-condensed font-bold uppercase transition-colors ${
                    !activeCategory
                        ? 'text-rudark-volt bg-rudark-volt/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
                All Products
            </Link>
            {allCategories.map(cat => (
                <div key={cat.slug}>
                    <Link
                        href={`/shop/${cat.slug}`}
                        className={`flex items-center justify-between py-2 px-3 text-sm font-condensed font-bold uppercase transition-colors ${
                            activeCategory === cat.slug
                                ? 'text-rudark-volt bg-rudark-volt/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span>{cat.name}</span>
                        {cat.product_count !== undefined && (
                            <span className="font-mono text-[10px] text-gray-600 font-normal">{cat.product_count}</span>
                        )}
                    </Link>
                    {/* Subcategories expand under active category */}
                    {activeCategory === cat.slug && cat.subcategories && cat.subcategories.length > 0 && (
                        <div className="ml-3 border-l border-rudark-grey/30 pl-3 mb-1 space-y-0.5">
                            {cat.subcategories.map(sub => (
                                <Link
                                    key={sub.slug}
                                    href={`/shop/${cat.slug}/${sub.slug}`}
                                    className={`block py-1.5 text-xs uppercase transition-colors ${
                                        activeSubcategory === sub.slug
                                            ? 'text-rudark-volt font-bold'
                                            : 'text-gray-500 hover:text-rudark-volt'
                                    }`}
                                >
                                    {sub.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    // Filters — shared between desktop sidebar and mobile drawer
    const filterControls = (
        <div className="space-y-6">
            {/* Search */}
            <div>
                <label className="block text-[10px] font-mono text-rudark-volt mb-2 uppercase tracking-widest">Search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="w-full bg-rudark-carbon border border-rudark-grey pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-rudark-volt focus:outline-none transition-colors text-sm"
                    />
                </div>
            </div>

            {/* Price Range */}
            <div>
                <label className="block text-[10px] font-mono text-rudark-volt mb-2 uppercase tracking-widest">Max Price</label>
                <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceMax}
                    onChange={e => setPriceMax(parseInt(e.target.value))}
                    className="w-full accent-rudark-volt"
                />
                <div className="flex justify-between text-xs text-gray-500 font-mono mt-1">
                    <span>RM 0</span>
                    <span className="text-white">RM {priceMax.toLocaleString()}</span>
                </div>
            </div>

            {/* Clear */}
            {hasFilters && (
                <button
                    onClick={clearFilters}
                    className="w-full py-2 border border-rudark-grey text-gray-400 hover:border-rudark-volt hover:text-white transition-colors text-xs font-mono uppercase"
                >
                    Clear Filters
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-rudark-matte text-white pt-32 pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-8">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-gray-500 mb-6">
                    <Link href="/" className="hover:text-rudark-volt transition-colors">Home</Link>
                    <span>/</span>
                    <Link
                        href="/shop"
                        className={`hover:text-rudark-volt transition-colors ${!activeCategory ? 'text-gray-300' : ''}`}
                    >
                        Shop
                    </Link>
                    {categoryName && (
                        <>
                            <span>/</span>
                            {subcategoryName ? (
                                <Link href={`/shop/${activeCategory}`} className="hover:text-rudark-volt transition-colors">
                                    {categoryName}
                                </Link>
                            ) : (
                                <span className="text-gray-300">{categoryName}</span>
                            )}
                        </>
                    )}
                    {subcategoryName && (
                        <>
                            <span>/</span>
                            <span className="text-gray-300">{subcategoryName}</span>
                        </>
                    )}
                </nav>

                {/* Page Title */}
                <h1 className="text-5xl md:text-7xl font-condensed font-bold uppercase mb-10 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 tracking-tighter">
                    {pageTitle}
                </h1>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* LEFT SIDEBAR — Desktop only */}
                    <aside className="hidden lg:block w-52 flex-shrink-0">
                        <div className="sticky top-32 space-y-8">
                            {categoryNav}
                            <div className="h-px bg-rudark-grey/30" />
                            {filterControls}
                        </div>
                    </aside>

                    {/* MAIN CONTENT */}
                    <div className="flex-1 min-w-0">

                        {/* Subcategory Tiles — only on category view (no subcategory selected) */}
                        {activeCategory && !activeSubcategory && currentSubcategories.length > 0 && (
                            <div className="mb-10">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                                    {currentSubcategories.map(sub => (
                                        <Link
                                            key={sub.slug}
                                            href={`/shop/${activeCategory}/${sub.slug}`}
                                            className="group flex items-center justify-between bg-rudark-carbon border border-rudark-grey/50 hover:border-rudark-volt p-4 transition-all duration-200"
                                        >
                                            <div>
                                                <h3 className="font-condensed font-bold text-white uppercase text-base group-hover:text-rudark-volt transition-colors leading-tight">
                                                    {sub.name}
                                                </h3>
                                                <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Browse</p>
                                            </div>
                                            <ArrowRight size={14} className="text-gray-600 group-hover:text-rudark-volt transition-colors flex-shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-px flex-1 bg-rudark-grey/30" />
                                    <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                                        All {categoryName} Products
                                    </span>
                                    <div className="h-px flex-1 bg-rudark-grey/30" />
                                </div>
                            </div>
                        )}

                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                            <p className="text-gray-500 font-mono text-xs uppercase">
                                Showing{' '}
                                <span className="text-white font-bold">{filteredProducts.length}</span>
                                {filteredProducts.length !== initialProducts.length && (
                                    <> of {initialProducts.length}</>
                                )}{' '}
                                products
                            </p>
                            <div className="flex gap-2 w-full sm:w-auto">
                                {/* Mobile filter button */}
                                <button
                                    onClick={() => setShowFilters(true)}
                                    className="lg:hidden flex-1 sm:flex-none px-4 py-2 bg-rudark-carbon border border-rudark-grey text-white hover:border-rudark-volt transition-colors flex items-center justify-center gap-2 text-xs font-mono uppercase"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    Browse & Filter
                                </button>
                                {/* Sort */}
                                <div className="relative flex-1 sm:flex-none">
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        className="w-full appearance-none bg-rudark-carbon border border-rudark-grey text-white px-4 py-2 pr-8 focus:border-rudark-volt focus:outline-none transition-colors font-mono text-xs uppercase cursor-pointer"
                                    >
                                        <option value="featured">Featured</option>
                                        <option value="newest">Newest</option>
                                        <option value="price-asc">Price: Low → High</option>
                                        <option value="price-desc">Price: High → Low</option>
                                        <option value="name">Name A–Z</option>
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Product Grid */}
                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredProducts.map(product => (
                                    <ProductCard key={product.sku || product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border border-rudark-grey/30">
                                <p className="text-gray-400 font-mono text-sm mb-4 uppercase tracking-widest">
                                    No products found
                                </p>
                                {hasFilters ? (
                                    <button
                                        onClick={clearFilters}
                                        className="px-6 py-2 bg-rudark-volt text-black font-condensed font-bold uppercase tracking-wider hover:bg-white transition-colors text-sm"
                                    >
                                        Clear Filters
                                    </button>
                                ) : (
                                    <Link
                                        href="/shop"
                                        className="text-rudark-volt hover:underline uppercase text-sm tracking-widest font-bold"
                                    >
                                        Browse All Products
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Newsletter */}
                <div className="mt-20">
                    <NewsletterForm source="shop_page" />
                </div>
            </div>

            {/* Mobile Filter / Browse Drawer */}
            {showFilters && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/80"
                    onClick={() => setShowFilters(false)}
                >
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-sm bg-rudark-carbon border-l border-rudark-grey overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-6 border-b border-rudark-grey/50">
                            <h3 className="text-xl font-condensed font-bold text-white uppercase">Browse & Filter</h3>
                            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-8">
                            {categoryNav}
                            <div className="h-px bg-rudark-grey/30" />
                            {filterControls}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ShopClient(props: ShopClientProps) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-rudark-matte pt-32 flex items-center justify-center text-gray-500 font-mono uppercase text-sm">
                Loading shop…
            </div>
        }>
            <ShopClientInner {...props} />
        </Suspense>
    );
}
