'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube, ArrowRight } from 'lucide-react';

export default function FooterRefined() {
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
                            <Link href="#" className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all">
                                <Instagram size={18} />
                            </Link>
                            <Link href="#" className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all">
                                <Facebook size={18} />
                            </Link>
                            <Link href="#" className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all">
                                <Youtube size={18} />
                            </Link>
                            <Link href="#" className="p-2 bg-rudark-matte rounded-full text-gray-400 hover:text-rudark-volt hover:bg-black transition-all">
                                <Twitter size={18} />
                            </Link>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="col-span-1 md:col-span-2">
                        <h4 className="font-condensed font-bold text-lg uppercase mb-6 text-white tracking-widest">Shop</h4>
                        <ul className="space-y-3">
                            <li><Link href="/shop/kayaks" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Kayaks</Link></li>
                            <li><Link href="/shop/pfds" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">PFDs</Link></li>
                            <li><Link href="/shop/accessories" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Accessories</Link></li>
                            <li><Link href="/shop/new-arrivals" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">New Arrivals</Link></li>
                        </ul>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <h4 className="font-condensed font-bold text-lg uppercase mb-6 text-white tracking-widest">Support</h4>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Order Status</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Returns</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Warranty</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-rudark-volt text-sm uppercase font-medium transition-colors">Contact Us</Link></li>
                        </ul>
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
