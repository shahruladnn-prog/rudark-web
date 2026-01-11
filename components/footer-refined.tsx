'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube, ArrowRight } from 'lucide-react';

interface FooterProps {
    categories?: Array<{ name: string; slug: string; product_count?: number }>;
}

export default function FooterRefined({ categories = [] }: FooterProps) {
    // Get top 5 categories by product count
    const topCategories = categories
        .sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
        .slice(0, 5);
    return (
        <footer className="bg-rudark-carbon border-t border-rudark-grey text-white pt-20 pb-8 relative overflow-hidden">

            {/* Mountain Silhouette Decoration (CSS drawn or SVG) */}
            <div className="absolute top-0 left-0 w-full h-8 bg-rudark-matte"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10% 20%, 20% 80%, 30% 10%, 40% 60%, 50% 10%, 60% 70%, 70% 20%, 80% 90%, 90% 30%)' }} />

            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">

                    {/* Newsletter Section (Left Prominent) */}
                    <div className="col-span-1 md:col-span-5 pr-8">
                        <div className="mb-8">
                            <span className="text-rudark-volt font-mono text-xs tracking-widest uppercase block mb-2">Join The Team</span>
                            <h3 className="text-4xl font-condensed font-bold uppercase leading-none mb-4">
                                Stay In The <span className="text-transparent bg-clip-text bg-gradient-to-r from-rudark-volt to-white">Loop</span>
                            </h3>
                            <p className="text-gray-400 text-sm mb-6 max-w-sm">
                                Sign up for exclusive access to new drops, pro-team stories, and expedition reports.
                            </p>
                            <form className="flex border-b border-rudark-grey hover:border-rudark-volt transition-colors pb-2">
                                <input
                                    type="email"
                                    placeholder="ENTER YOUR EMAIL"
                                    className="bg-transparent w-full outline-none text-white placeholder-gray-600 font-condensed uppercase tracking-wide"
                                />
                                <button type="submit" className="text-rudark-volt hover:text-white transition-colors">
                                    <ArrowRight size={20} />
                                </button>
                            </form>
                        </div>

                        <div className="flex gap-4">
                            <Link
                                href="https://www.instagram.com/rudark.my/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all"
                                aria-label="Instagram"
                            >
                                <Instagram size={18} />
                            </Link>
                            <Link
                                href="https://www.facebook.com/rudaark/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all"
                                aria-label="Facebook"
                            >
                                <Facebook size={18} />
                            </Link>
                            <Link
                                href="https://www.youtube.com/@rudark"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all"
                                aria-label="YouTube"
                            >
                                <Youtube size={18} />
                            </Link>
                            <Link
                                href="https://www.tiktok.com/@rudark.my"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all"
                                aria-label="TikTok"
                            >
                                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="col-span-1 md:col-span-2">
                        <h4 className="font-condensed font-bold text-lg uppercase mb-6 text-white tracking-widest">Shop</h4>
                        <ul className="space-y-3">
                            {topCategories.length > 0 ? (
                                <>
                                    {topCategories.map((category) => (
                                        <li key={category.slug}>
                                            <Link
                                                href={`/shop?category=${category.slug}`}
                                                className="text-gray-400 hover:text-rudark-volt transition-colors text-sm flex justify-between items-center group"
                                            >
                                                <span className="uppercase">{category.name}</span>
                                                {category.product_count !== undefined && (
                                                    <span className="text-xs text-gray-600 group-hover:text-rudark-volt font-mono">
                                                        ({category.product_count})
                                                    </span>
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                    <li className="pt-2">
                                        <Link
                                            href="/shop"
                                            className="text-rudark-volt hover:text-white transition-colors text-sm uppercase font-bold flex items-center gap-1"
                                        >
                                            View All →
                                        </Link>
                                    </li>
                                </>
                            ) : (
                                <>
                                    <li><Link href="/shop" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">All Products</Link></li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="text-lg font-bold font-condensed mb-6 uppercase tracking-wider text-white border-b border-rudark-grey inline-block pb-2">Support</h4>
                        <div className="flex flex-col space-y-3 font-mono">
                            <Link href="/order-tracking" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">
                                Order Status
                            </Link>
                            <Link href="/returns" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm">RETURNS</Link>
                            <Link href="/warranty" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm">WARRANTY</Link>
                            <Link href="/contact" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm">CONTACT US</Link>
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-3">
                        <h4 className="font-condensed font-bold text-lg uppercase mb-6 text-white tracking-widest">Company</h4>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">About Rud'Ark</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Our Athletes</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Sustainability</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Careers</Link></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-rudark-grey/30 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-mono uppercase tracking-wider">
                    <p>© 2025 Rud'Ark Pro Shop. All rights reserved.</p>
                    <div className="flex gap-6 mt-4 md:mt-0">
                        <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
