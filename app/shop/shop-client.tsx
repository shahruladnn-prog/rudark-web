'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import AddToCartButton from '@/components/add-to-cart-button';

interface ShopClientProps {
    initialProducts: Product[];
    categories: Array<{ name: string; slug: string; product_count: number }>;
}

export default function ShopClient({ initialProducts, categories }: ShopClientProps) {
    const [products, setProducts] = useState(initialProducts);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [priceRange, setPriceRange] = useState([0, 10000]);
    const [sortBy, setSortBy] = useState('featured');
    const [showFilters, setShowFilters] = useState(false);

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        let filtered = [...products];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Category filter
        if (selectedCategories.length > 0) {
            filtered = filtered.filter(p =>
                selectedCategories.includes(p.category_slug || '')
            );
        }

        // Price filter
        filtered = filtered.filter(p =>
            p.web_price >= priceRange[0] && p.web_price <= priceRange[1]
        );

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-asc':
                    return a.web_price - b.web_price;
                case 'price-desc':
                    return b.web_price - a.web_price;
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'newest':
                    return (b.created_at || 0) - (a.created_at || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [products, searchQuery, selectedCategories, priceRange, sortBy]);

    const toggleCategory = (slug: string) => {
        setSelectedCategories(prev =>
            prev.includes(slug)
                ? prev.filter(s => s !== slug)
                : [...prev, slug]
        );
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setPriceRange([0, 10000]);
        setSearchQuery('');
        setSortBy('featured');
    };

    return (
        <div className="min-h-screen bg-rudark-matte pt-32"> {/* Added pt-32 for navbar */}
            {/* Hero Section */}
            <div className="bg-rudark-carbon border-b border-rudark-grey">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
                    <h1 className="text-5xl md:text-7xl font-condensed font-bold text-white uppercase mb-4">
                        Shop <span className="text-rudark-volt">All Gear</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        Premium technical equipment for aquatic dominance. Built for professionals, tested by athletes.
                    </p>
                </div>
            </div>

            {/* Category Cards */}
            <div className="bg-rudark-matte border-b border-rudark-grey/30">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {categories.map((category) => (
                            <button
                                key={category.slug}
                                onClick={() => toggleCategory(category.slug)}
                                className={`
                                    group relative overflow-hidden rounded-sm border-2 transition-all duration-300
                                    ${selectedCategories.includes(category.slug)
                                        ? 'border-rudark-volt bg-rudark-volt/10'
                                        : 'border-rudark-grey hover:border-rudark-volt bg-rudark-carbon'
                                    }
                                `}
                            >
                                <div className="p-3 text-center">
                                    <h3 className="font-condensed font-bold text-sm uppercase text-white mb-1">
                                        {category.name}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono">
                                        {category.product_count}
                                    </p>
                                </div>
                                {selectedCategories.includes(category.slug) && (
                                    <div className="absolute top-1 right-1">
                                        <div className="w-5 h-5 bg-rudark-volt rounded-full flex items-center justify-center">
                                            <span className="text-black text-xs font-bold">✓</span>
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar - Desktop */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="sticky top-32 space-y-6">
                            {/* Search */}
                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase tracking-wider">
                                    Search
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search products..."
                                        className="w-full bg-rudark-carbon border border-rudark-grey rounded-sm pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:border-rudark-volt focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Price Range */}
                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase tracking-wider">
                                    Price Range
                                </label>
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="10000"
                                        step="100"
                                        value={priceRange[1]}
                                        onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                                        className="w-full accent-rudark-volt"
                                    />
                                    <div className="flex justify-between text-sm text-gray-400 font-mono">
                                        <span>RM 0</span>
                                        <span>RM {priceRange[1]}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {(selectedCategories.length > 0 || searchQuery || priceRange[1] < 10000) && (
                                <button
                                    onClick={clearFilters}
                                    className="w-full px-4 py-2 bg-rudark-carbon border border-rudark-grey text-gray-400 hover:border-rudark-volt hover:text-white transition-colors rounded-sm text-sm font-mono uppercase"
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* Products Grid */}
                    <div className="flex-1">
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            {/* Product Count */}
                            <p className="text-gray-400 font-mono text-sm">
                                Showing <span className="text-white font-bold">{filteredProducts.length}</span> of {products.length} products
                            </p>

                            <div className="flex gap-3 w-full sm:w-auto">
                                {/* Mobile Filter Button */}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="lg:hidden flex-1 sm:flex-none px-4 py-2 bg-rudark-carbon border border-rudark-grey text-white hover:border-rudark-volt transition-colors rounded-sm flex items-center justify-center gap-2"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    <span className="font-mono text-sm uppercase">Filters</span>
                                </button>

                                {/* Sort Dropdown */}
                                <div className="relative flex-1 sm:flex-none">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full appearance-none bg-rudark-carbon border border-rudark-grey text-white px-4 py-2 pr-10 rounded-sm focus:border-rudark-volt focus:outline-none transition-colors font-mono text-sm uppercase cursor-pointer"
                                    >
                                        <option value="featured">Featured</option>
                                        <option value="newest">Newest</option>
                                        <option value="price-asc">Price: Low to High</option>
                                        <option value="price-desc">Price: High to Low</option>
                                        <option value="name">Name: A-Z</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Products Grid */}
                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-gray-400 text-lg mb-4">No products found</p>
                                <button
                                    onClick={clearFilters}
                                    className="px-6 py-2 bg-rudark-volt text-black font-condensed font-bold uppercase tracking-wider hover:bg-white transition-colors rounded-sm"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filter Drawer */}
            {showFilters && (
                <div className="lg:hidden fixed inset-0 z-50 bg-black/80" onClick={() => setShowFilters(false)}>
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-sm bg-rudark-carbon border-l border-rudark-grey p-6 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-condensed font-bold text-white uppercase">Filters</h3>
                            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Search */}
                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Search</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full bg-rudark-matte border border-rudark-grey rounded-sm px-4 py-3 text-white"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-xs font-mono text-rudark-volt mb-2 uppercase">Price Range</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="10000"
                                    step="100"
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                                    className="w-full accent-rudark-volt"
                                />
                                <p className="text-sm text-gray-400 mt-2">Up to RM {priceRange[1]}</p>
                            </div>

                            <button
                                onClick={() => {
                                    clearFilters();
                                    setShowFilters(false);
                                }}
                                className="w-full px-4 py-3 bg-rudark-volt text-black font-condensed font-bold uppercase rounded-sm"
                            >
                                Clear & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Product Card Component
function ProductCard({ product }: { product: Product }) {
    const isOutOfStock = product.stock_status === 'OUT';
    const isLowStock = product.stock_status === 'LOW';

    return (
        <div className="group bg-rudark-carbon border border-rudark-grey rounded-sm overflow-hidden hover:border-rudark-volt transition-all duration-300">
            <Link href={`/product/${product.sku}`} className="block">
                {/* Image */}
                <div className="relative aspect-square bg-rudark-matte overflow-hidden">
                    {product.images?.[0] ? (
                        <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                            No Image
                        </div>
                    )}

                    {/* Stock Badge */}
                    {isLowStock && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-orange-600 text-white text-xs font-mono uppercase">
                            Low Stock
                        </div>
                    )}
                    {isOutOfStock && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs font-mono uppercase">
                            Out of Stock
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-4">
                    <h3 className="font-condensed font-bold text-lg text-white uppercase mb-2 line-clamp-2 group-hover:text-rudark-volt transition-colors">
                        {product.name}
                    </h3>
                    <p className="text-rudark-volt font-mono font-bold text-xl mb-3">
                        RM {product.web_price.toFixed(2)}
                    </p>
                </div>
            </Link>

            {/* Add to Cart */}
            <div className="px-4 pb-4">
                <AddToCartButton product={product} />
            </div>
        </div>
    );
}
