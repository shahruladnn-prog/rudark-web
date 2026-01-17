'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Youtube, ArrowRight, Mail, Phone, MapPin } from 'lucide-react';

interface FooterProps {
    categories?: Array<{ name: string; slug: string; product_count?: number }>;
}

export default function FooterRefined({ categories = [] }: FooterProps) {
    // Get top 5 categories by product count
    const topCategories = categories
        .sort((a, b) => (b.product_count || 0) - (a.product_count || 0))
        .slice(0, 5);

    return (
        <footer className="bg-rudark-carbon border-t border-rudark-grey text-white pt-16 pb-8 relative overflow-hidden">

            {/* Mountain Silhouette Decoration */}
            <div className="absolute top-0 left-0 w-full h-6 bg-rudark-matte"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 10% 20%, 20% 80%, 30% 10%, 40% 60%, 50% 10%, 60% 70%, 70% 20%, 80% 90%, 90% 30%)' }} />

            <div className="max-w-7xl mx-auto px-4 md:px-8">

                {/* Main Footer Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12">

                    {/* Contact & Brand Section */}
                    <div className="col-span-1 md:col-span-5">
                        {/* Dual Logo Section */}
                        <div className="flex items-center gap-4 mb-6">
                            <Image
                                src="/logo.png"
                                alt="Rud'Ark"
                                width={50}
                                height={50}
                                className="object-contain"
                            />
                            <div className="w-px h-10 bg-rudark-grey" />
                            <Image
                                src="/GGPR white LOGO-01.png"
                                alt="GGP Resources Sdn Bhd"
                                width={120}
                                height={40}
                                className="object-contain"
                            />
                        </div>

                        {/* Company Info */}
                        <h3 className="text-xs text-rudark-volt font-mono uppercase tracking-widest mb-2">
                            A Brand by GGP Resources Sdn Bhd
                        </h3>

                        {/* Contact Details */}
                        <div className="space-y-3 mb-6">
                            <a
                                href="mailto:hello@rudark.my"
                                className="flex items-center gap-3 text-gray-400 hover:text-rudark-volt transition-colors group"
                            >
                                <Mail size={16} className="text-rudark-volt" />
                                <span className="text-sm font-mono">hello@rudark.my</span>
                            </a>
                            <a
                                href="tel:+60135518857"
                                className="flex items-center gap-3 text-gray-400 hover:text-rudark-volt transition-colors group"
                            >
                                <Phone size={16} className="text-rudark-volt" />
                                <span className="text-sm font-mono">+60 13-551 8857</span>
                            </a>
                            <a
                                href="https://maps.app.goo.gl/QetxHvtzAeTXEPPn7"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 text-gray-400 hover:text-rudark-volt transition-colors group"
                            >
                                <MapPin size={16} className="text-rudark-volt mt-0.5 flex-shrink-0" />
                                <span className="text-sm leading-relaxed">
                                    Lot 10846, Jalan Besar Kampung Chulek,<br />
                                    31600 Gopeng, Perak, Malaysia
                                </span>
                            </a>
                        </div>

                        {/* Social Links */}
                        <div className="flex gap-3">
                            <Link
                                href="https://www.instagram.com/rudark.my/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-rudark-matte rounded-sm text-gray-400 hover:text-rudark-volt hover:bg-black transition-all border border-rudark-grey/30"
                                aria-label="Instagram"
                            >
                                <Instagram size={18} />
                            </Link>
                            <Link
                                href="https://www.facebook.com/rudaark/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-rudark-matte rounded-sm text-gray-400 hover:text-rudark-volt hover:bg-black transition-all border border-rudark-grey/30"
                                aria-label="Facebook"
                            >
                                <Facebook size={18} />
                            </Link>
                            <Link
                                href="https://www.youtube.com/@rudark"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-rudark-matte rounded-sm text-gray-400 hover:text-rudark-volt hover:bg-black transition-all border border-rudark-grey/30"
                                aria-label="YouTube"
                            >
                                <Youtube size={18} />
                            </Link>
                            <Link
                                href="https://www.tiktok.com/@rudark.my"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 bg-rudark-matte rounded-sm text-gray-400 hover:text-rudark-volt hover:bg-black transition-all border border-rudark-grey/30"
                                aria-label="TikTok"
                            >
                                <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Shop Links */}
                    <div className="col-span-1 md:col-span-2">
                        <h4 className="font-condensed font-bold text-lg uppercase mb-5 text-white tracking-wider">Shop</h4>
                        <ul className="space-y-2.5">
                            {topCategories.length > 0 ? (
                                <>
                                    {topCategories.map((category) => (
                                        <li key={category.slug}>
                                            <Link
                                                href={`/shop?category=${category.slug}`}
                                                className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase"
                                            >
                                                {category.name}
                                            </Link>
                                        </li>
                                    ))}
                                    <li className="pt-1">
                                        <Link
                                            href="/shop"
                                            className="text-rudark-volt hover:text-white transition-colors text-sm uppercase font-bold flex items-center gap-1"
                                        >
                                            View All →
                                        </Link>
                                    </li>
                                </>
                            ) : (
                                <li><Link href="/shop" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">All Products</Link></li>
                            )}
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div className="col-span-1 md:col-span-2">
                        <h4 className="font-condensed font-bold text-lg uppercase mb-5 text-white tracking-wider">Support</h4>
                        <ul className="space-y-2.5">
                            <li><a href="https://myparcelasia.com/track" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">Track Order</a></li>
                            <li><Link href="/shipping-policy" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">Shipping & Returns</Link></li>
                            <li><Link href="/refund-policy" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">Refund Policy</Link></li>
                            <li><Link href="/contact" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div className="col-span-1 md:col-span-3">
                        <h4 className="font-condensed font-bold text-lg uppercase mb-5 text-white tracking-wider">Company</h4>
                        <ul className="space-y-2.5">
                            <li><Link href="/about" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">About Rud'Ark</Link></li>
                            <li><Link href="/privacy-policy" className="text-gray-400 hover:text-rudark-volt transition-colors text-sm uppercase">Privacy Policy</Link></li>
                        </ul>

                        {/* Newsletter Mini */}
                        <div className="mt-6 pt-4 border-t border-rudark-grey/30">
                            <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Join Newsletter</p>
                            <form className="flex border border-rudark-grey hover:border-rudark-volt transition-colors rounded-sm overflow-hidden">
                                <input
                                    type="email"
                                    placeholder="Your email"
                                    className="bg-rudark-matte flex-1 px-3 py-2 outline-none text-white placeholder-gray-600 text-sm"
                                />
                                <button type="submit" className="bg-rudark-volt text-black px-3 hover:bg-white transition-colors">
                                    <ArrowRight size={16} />
                                </button>
                            </form>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="pt-6 border-t border-rudark-grey/30 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                        <span>© 2025 Rud'Ark Pro Shop.</span>
                        <span className="hidden md:inline">|</span>
                        <span>A GGP Resources Brand</span>
                    </div>
                    <div className="flex gap-6 text-xs text-gray-500 font-mono uppercase">
                        <Link href="/privacy-policy" className="hover:text-rudark-volt transition-colors">Privacy</Link>
                        <Link href="/refund-policy" className="hover:text-rudark-volt transition-colors">Refunds</Link>
                        <Link href="/shipping-policy" className="hover:text-rudark-volt transition-colors">Shipping</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
