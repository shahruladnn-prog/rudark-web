'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface MegaMenuProps {
    isOpen: boolean;
    categories: any[];
}

export default function MegaMenu({ isOpen, categories }: MegaMenuProps) {
    const [activeTab, setActiveTab] = useState<string | null>(null);

    // Set first category as active by default when menu opens
    useEffect(() => {
        if (isOpen && categories.length > 0 && !activeTab) {
            setActiveTab(categories[0].id || categories[0].slug);
        }
    }, [isOpen, categories, activeTab]);

    if (!isOpen) return null;

    const activeCategory = categories.find(c => (c.id === activeTab || c.slug === activeTab));

    // Empty state when no categories
    if (categories.length === 0) {
        return (
            <div
                className="absolute left-0 w-full bg-rudark-carbon border-b border-rudark-grey shadow-2xl z-40 overflow-hidden"
                style={{ top: '100%' }}
            >
                <div className="max-w-7xl mx-auto p-12 text-center">
                    <Link href="/shop" className="text-2xl font-condensed font-bold text-rudark-volt hover:text-white uppercase">
                        Browse All Products →
                    </Link>
                    <p className="text-gray-500 mt-4 text-sm">Categories loading or not available</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="absolute left-0 w-full bg-rudark-carbon border-b border-rudark-grey shadow-2xl z-40 overflow-hidden group"
            style={{ top: '100%' }}
            onMouseEnter={() => { }} // dummy handler to ensure react knows it's interactive?
        >
            {/* Hover Bridge: Connects navbar to menu to prevent accidental closing */}
            <div className="absolute -top-6 left-0 w-full h-6 bg-transparent" />

            <div className="max-w-7xl mx-auto flex min-h-[400px]">

                {/* Left Tabs (Categories) */}
                <div className="w-1/4 bg-rudark-matte border-r border-rudark-grey py-8">
                    <ul>
                        {categories.map((cat) => (
                            <li key={cat.id || cat.slug}>
                                <button
                                    onMouseEnter={() => setActiveTab(cat.id || cat.slug)}
                                    className={`w-full text-left px-8 py-3 flex items-center justify-between group transition-colors ${(activeTab === cat.id || activeTab === cat.slug)
                                        ? 'text-rudark-volt bg-rudark-carbon'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="font-condensed font-bold uppercase tracking-wider text-xl">
                                        {cat.name || cat.category_name}
                                    </span>
                                    {(activeTab === cat.id || activeTab === cat.slug) && (
                                        <ChevronRight size={16} className="text-rudark-volt" />
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right Content (Subcategories) */}
                <div className="w-3/4 p-12 bg-rudark-carbon">
                    {activeCategory && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex justify-between items-start mb-8 border-b border-rudark-grey/30 pb-4">
                                <h2 className="text-4xl font-condensed font-bold text-white uppercase">
                                    {activeCategory.name || activeCategory.category_name}
                                </h2>
                                <Link
                                    href={`/shop/${activeCategory.slug}`}
                                    className="flex items-center gap-2 text-rudark-volt hover:text-white transition-colors font-bold uppercase text-sm tracking-widest"
                                >
                                    View All <ArrowRight size={16} />
                                </Link>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                {(activeCategory.subcategories || []).map((sub: any) => (
                                    <Link
                                        key={sub.slug}
                                        href={`/shop/${activeCategory.slug}/${sub.slug}`}
                                        className="group block p-4 rounded-sm hover:bg-rudark-matte transition-colors border border-transparent hover:border-rudark-grey/50"
                                    >
                                        <h3 className="font-bold text-white uppercase mb-2 group-hover:text-rudark-volt transition-colors">
                                            {sub.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono">
                                            BROWSE COLLECTION
                                        </p>
                                    </Link>
                                ))}
                                {(!activeCategory.subcategories || activeCategory.subcategories.length === 0) && (
                                    <div className="col-span-3 text-gray-500 italic">No subcategories found.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
