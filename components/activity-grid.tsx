'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Category } from '@/types';

interface ActivityGridProps {
    categories?: Category[];
}

export default function ActivityGrid({ categories = [] }: ActivityGridProps) {
    // Filter out categories without images if we want to be strict, or just show all.
    // Let's show all, but prioritize ones with images.
    // Or just show the top 4/5. 
    const displayCategories = categories.slice(0, 5);

    return (
        <section className="bg-rudark-matte py-20 px-4 md:px-8">
            <div className="max-w-7xl mx-auto mb-12 flex justify-between items-end border-b border-rudark-grey pb-4">
                <h2 className="text-4xl md:text-5xl font-condensed font-bold text-white uppercase">
                    Shop By <span className="text-rudark-volt">Activity</span>
                </h2>
                <Link href="/shop" className="hidden md:flex items-center text-gray-400 hover:text-white uppercase tracking-widest text-sm font-bold transition-colors">
                    View All Categories <ArrowRight size={16} className="ml-2" />
                </Link>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2 gap-4 h-auto lg:h-[600px]">
                {displayCategories.map((cat, index) => {
                    // Bento Grid Logic
                    // Item 0: Large (2x2)
                    // Item 1, 2: Tall or Wide? 
                    // Let's do a dynamic layout based on index.

                    let spanClass = "col-span-1 row-span-1";
                    if (index === 0) spanClass = "lg:col-span-3 lg:row-span-2"; // Big left
                    else if (index === 1) spanClass = "lg:col-span-3 lg:row-span-1"; // Wide top right
                    else if (index === 2) spanClass = "lg:col-span-1 lg:row-span-1"; // Small
                    else if (index === 3) spanClass = "lg:col-span-2 lg:row-span-1"; // Medium

                    // Fallback for generic grid if not fitting the bento perfectly
                    if (displayCategories.length < 3) spanClass = "md:col-span-1 h-[400px]";

                    return (
                        <Link
                            key={cat.id || cat.slug}
                            href={`/shop/${cat.slug}`}
                            className={`group relative overflow-hidden block ${spanClass} bg-rudark-carbon border border-rudark-grey/30 rounded-sm min-h-[300px] lg:min-h-0`}
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                                {cat.image ? (
                                    <img
                                        src={cat.image}
                                        alt={cat.name}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-rudark-carbon to-gray-900 opacity-60 group-hover:opacity-80 transition-opacity" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />
                            </div>

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-10">
                                <h3 className="text-3xl md:text-5xl font-condensed font-bold text-white uppercase mb-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 leading-none">
                                    {cat.name}
                                </h3>
                                <div className="h-1 w-12 bg-rudark-volt transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left mb-4" />
                                <p className="text-gray-400 font-mono text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 line-clamp-1">
                                    {cat.subcategories?.slice(0, 3).map(s => s.name).join(' / ')}
                                </p>
                            </div>

                            {/* Hover Overlay Flash */}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-overlay" />
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
